import scrollIntoView from 'scroll-into-view';

import Delegator from './delegator';
import { Adder } from './adder';

import * as htmlAnchoring from './anchoring/html';
import { TextRange } from './anchoring/text-range';
import {
  getHighlightsContainingNode,
  highlightRange,
  removeAllHighlights,
  removeHighlights,
  setHighlightsFocused,
  setHighlightsVisible,
} from './highlighter';
import * as rangeUtil from './range-util';
import { SelectionObserver } from './selection-observer';
import { normalizeURI } from './util/url';

/**
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Anchor} Anchor
 * @typedef {import('../types/api').Target} Target
 * @typedef {import('./toolbar').ToolbarController} ToolbarController
 */

/**
 * HTML element created by the highlighter with an associated annotation.
 *
 * @typedef {HTMLElement & { _annotation?: AnnotationData }} AnnotationHighlight
 */

/**
 * Return all the annotations associated with the selected text.
 *
 * @return {AnnotationData[]}
 */
function annotationsForSelection() {
  const selection = /** @type {Selection} */ (window.getSelection());
  const range = selection.getRangeAt(0);
  const items = rangeUtil.itemsForRange(
    range,

    // nb. Only non-nullish items are returned by `itemsForRange`.
    node => /** @type {AnnotationHighlight} */ (node)._annotation
  );
  return /** @type {AnnotationData[]} */ (items);
}

/**
 * Return the annotations associated with any highlights that contain a given
 * DOM node.
 *
 * @param {Node} node
 * @return {AnnotationData[]}
 */
function annotationsAt(node) {
  const items = getHighlightsContainingNode(node)
    .map(h => /** @type {AnnotationHighlight} */ (h)._annotation)
    .filter(ann => ann !== undefined);
  return /** @type {AnnotationData[]} */ (items);
}

/**
 * Resolve an anchor's associated document region to a concrete `Range`.
 *
 * This may fail if anchoring failed or if the document has been mutated since
 * the anchor was created in a way that invalidates the anchor.
 *
 * @param {Anchor} anchor
 * @return {Range|null}
 */
function resolveAnchor(anchor) {
  if (!anchor.range) {
    return null;
  }
  try {
    return anchor.range.toRange();
  } catch {
    return null;
  }
}

/**
 * `Guest` is the central class of the annotator that handles anchoring (locating)
 * annotations in the document when they are fetched by the sidebar, rendering
 * highlights for them and handling subsequent interactions with the highlights.
 *
 * It is also responsible for listening to changes in the current selection
 * and triggering the display of controls to create new annotations. When one
 * of these controls is clicked, it creates the new annotation and sends it to
 * the sidebar.
 *
 * Within a browser tab, there is typically one `Guest` instance per frame that
 * loads Hypothesis (not all frames will be annotation-enabled). In one frame,
 * usually the top-level one, there will also be an instance of the `Sidebar`
 * class that shows the sidebar app and surrounding UI. The `Guest` instance in
 * each frame connects to the sidebar via the `CrossFrame` service.
 *
 * The anchoring implementation defaults to a generic one for HTML documents and
 * can be overridden to handle different document types.
 */
export default class Guest extends Delegator {
  /**
   * Initialize the Guest.
   *
   * @param {HTMLElement} element -
   *   The root element in which the `Guest` instance should be able to anchor
   *   or create annotations. In an ordinary web page this typically `document.body`.
   * @param {Object} config
   * @param {typeof htmlAnchoring} anchoring - Anchoring implementation
   */
  constructor(element, config, anchoring = htmlAnchoring) {
    const defaultConfig = {
      // This causes the `Document` plugin to be initialized.
      Document: {},
    };

    super(element, { ...defaultConfig, ...config });

    this.visibleHighlights = false;

    /** @type {ToolbarController|null} */
    this.toolbar = null;

    this.adderToolbar = document.createElement('hypothesis-adder');
    this.adderToolbar.style.display = 'none';
    this.element.appendChild(this.adderToolbar);

    this.adderCtrl = new Adder(this.adderToolbar, {
      onAnnotate: () => {
        this.createAnnotation();
        /** @type {Selection} */ (document.getSelection()).removeAllRanges();
      },
      onHighlight: () => {
        this.setVisibleHighlights(true);
        this.createHighlight();
        /** @type {Selection} */ (document.getSelection()).removeAllRanges();
      },
      onShowAnnotations: anns => {
        this.selectAnnotations(anns);
      },
    });

    this.selectionObserver = new SelectionObserver(range => {
      if (range) {
        this._onSelection(range);
      } else {
        this._onClearSelection();
      }
    });

    this.plugins = {};

    /** @type {Anchor[]} */
    this.anchors = [];

    // Set the frame identifier if it's available.
    // The "top" guest instance will have this as null since it's in a top frame not a sub frame
    this.frameIdentifier = config.subFrameIdentifier || null;

    this.anchoring = anchoring;

    const cfOptions = {
      config,
      on: (event, handler) => {
        this.subscribe(event, handler);
      },
      emit: (event, ...args) => {
        this.publish(event, args);
      },
    };

    this.addPlugin('CrossFrame', cfOptions);
    this.crossframe = this.plugins.CrossFrame;
    this.crossframe.onConnect(() => this._setupInitialState(config));

    // Whether clicks on non-highlighted text should close the sidebar
    this.closeSidebarOnDocumentClick = true;
    this._connectAnnotationSync();
    this._connectAnnotationUISync(this.crossframe);

    // Load plugins
    for (let name of Object.keys(this.options)) {
      const opts = this.options[name];
      if (!this.plugins[name] && this.options.pluginClasses[name]) {
        this.addPlugin(name, opts);
      }
    }

    // Setup event handlers on the root element
    this._elementEventListeners = [];
    this._setupElementEvents();
  }

  // Add DOM event listeners for clicks, taps etc. on the document and
  // highlights.
  _setupElementEvents() {
    const addListener = (event, callback) => {
      this.element.addEventListener(event, callback);
      this._elementEventListeners.push({ event, callback });
    };

    // Hide the sidebar in response to a document click or tap, so it doesn't obscure
    // the document content.
    const maybeHideSidebar = event => {
      if (!this.closeSidebarOnDocumentClick || this.isEventInAnnotator(event)) {
        // Don't hide the sidebar if event occurred inside Hypothesis UI, or
        // the user is making a selection, or the behavior was disabled because
        // the sidebar doesn't overlap the content.
        return;
      }
      this.crossframe?.call('hideSidebar');
    };

    addListener('click', event => {
      const annotations = annotationsAt(event.target);
      if (annotations.length && this.visibleHighlights) {
        const toggle = event.metaKey || event.ctrlKey;
        this.selectAnnotations(annotations, toggle);
      } else {
        maybeHideSidebar(event);
      }
    });

    // Allow taps on the document to hide the sidebar as well as clicks, because
    // on touch-input devices, not all elements will generate a "click" event.
    addListener('touchstart', event => {
      if (!annotationsAt(event.target).length) {
        maybeHideSidebar(event);
      }
    });

    addListener('mouseover', event => {
      const annotations = annotationsAt(event.target);
      if (annotations.length && this.visibleHighlights) {
        this.focusAnnotations(annotations);
      }
    });

    addListener('mouseout', () => {
      if (this.visibleHighlights) {
        this.focusAnnotations([]);
      }
    });
  }

  _removeElementEvents() {
    this._elementEventListeners.forEach(({ event, callback }) => {
      this.element.removeEventListener(event, callback);
    });
  }

  addPlugin(name, options) {
    const Klass = this.options.pluginClasses[name];
    this.plugins[name] = new Klass(this.element, options, this);
  }

  /**
   * Retrieve metadata for the current document.
   */
  getDocumentInfo() {
    let metadataPromise;
    let uriPromise;
    if (this.plugins.PDF) {
      metadataPromise = Promise.resolve(this.plugins.PDF.getMetadata());
      uriPromise = Promise.resolve(this.plugins.PDF.uri());
    } else if (this.plugins.Document) {
      uriPromise = Promise.resolve(this.plugins.Document.uri());
      metadataPromise = Promise.resolve(this.plugins.Document.metadata);
    } else {
      uriPromise = Promise.reject();
      metadataPromise = Promise.reject();
    }

    uriPromise = uriPromise.catch(() =>
      decodeURIComponent(window.location.href)
    );
    metadataPromise = metadataPromise.catch(() => ({
      title: document.title,
      link: [{ href: decodeURIComponent(window.location.href) }],
    }));

    return Promise.all([metadataPromise, uriPromise]).then(
      ([metadata, href]) => {
        return {
          uri: normalizeURI(href),
          metadata,
          frameIdentifier: this.frameIdentifier,
        };
      }
    );
  }

  _setupInitialState(config) {
    this.publish('panelReady');
    this.setVisibleHighlights(config.showHighlights === 'always');
  }

  _connectAnnotationSync() {
    this.subscribe('annotationDeleted', annotation => {
      this.detach(annotation);
    });

    this.subscribe('annotationsLoaded', annotations => {
      annotations.map(annotation => this.anchor(annotation));
    });
  }

  _connectAnnotationUISync(crossframe) {
    crossframe.on('focusAnnotations', (tags = []) => {
      for (let anchor of this.anchors) {
        if (anchor.highlights) {
          const toggle = tags.includes(anchor.annotation.$tag);
          setHighlightsFocused(anchor.highlights, toggle);
        }
      }
    });

    crossframe.on('scrollToAnnotation', tag => {
      for (let anchor of this.anchors) {
        if (anchor.highlights) {
          if (anchor.annotation.$tag === tag) {
            const range = resolveAnchor(anchor);
            if (!range) {
              continue;
            }

            const event = new CustomEvent('scrolltorange', {
              bubbles: true,
              cancelable: true,
              detail: range,
            });
            const defaultNotPrevented = this.element.dispatchEvent(event);
            if (defaultNotPrevented) {
              scrollIntoView(anchor.highlights[0]);
            }
          }
        }
      }
    });

    crossframe.on('getDocumentInfo', cb => {
      this.getDocumentInfo()
        .then(info => cb(null, info))
        .catch(reason => cb(reason));
    });

    crossframe.on('setVisibleHighlights', state => {
      this.setVisibleHighlights(state);
    });
  }

  destroy() {
    this._removeElementEvents();

    this.selectionObserver.disconnect();
    this.adderToolbar.remove();

    removeAllHighlights(this.element);

    for (let name of Object.keys(this.plugins)) {
      this.plugins[name].destroy();
    }

    super.destroy();
  }

  /**
   * Anchor (locate) an annotation's selectors in the document.
   *
   * @param {AnnotationData} annotation
   * @return {Promise<Anchor[]>}
   */
  anchor(annotation) {
    let anchor;
    const root = this.element;

    // Anchors for all annotations are in the `anchors` instance property. These
    // are anchors for this annotation only. After all the targets have been
    // processed these will be appended to the list of anchors known to the
    // instance. Anchors hold an annotation, a target of that annotation, a
    // document range for that target and an Array of highlights.
    const anchors = [];

    // The targets that are already anchored. This function consults this to
    // determine which targets can be left alone.
    const anchoredTargets = [];

    // These are the highlights for existing anchors of this annotation with
    // targets that have since been removed from the annotation. These will
    // be removed by this function.
    let deadHighlights = [];

    // Initialize the target array.
    if (!annotation.target) {
      annotation.target = [];
    }

    /**
     * Locate the region of the current document that the annotation refers to.
     *
     * @param {Target} target
     */
    const locate = target => {
      // Check that the anchor has a TextQuoteSelector -- without a
      // TextQuoteSelector we have no basis on which to verify that we have
      // reanchored correctly and so we shouldn't even try.
      //
      // Returning an anchor without a range will result in this annotation being
      // treated as an orphan (assuming no other targets anchor).
      if (
        !target.selector ||
        !target.selector.some(s => s.type === 'TextQuoteSelector')
      ) {
        return Promise.resolve({ annotation, target });
      }

      // Find a target using the anchoring module.
      return this.anchoring
        .anchor(root, target.selector)
        .then(range => ({
          annotation,
          target,

          // Convert the `Range` to a `TextRange` which can be converted back to
          // a `Range` later. The `TextRange` representation allows for highlights
          // to be inserted during anchoring other annotations without "breaking"
          // this anchor.
          range: TextRange.fromRange(range),
        }))
        .catch(() => ({
          annotation,
          target,
        }));
    };

    /**
     * Highlight the range for an anchor.
     *
     * @param {Anchor} anchor
     */
    const highlight = anchor => {
      const range = resolveAnchor(anchor);
      if (!range) {
        return anchor;
      }

      const highlights = /** @type {AnnotationHighlight[]} */ (highlightRange(
        range
      ));
      highlights.forEach(h => {
        h._annotation = anchor.annotation;
      });
      anchor.highlights = highlights;
      return anchor;
    };

    /**
     * Inform other parts of Hypothesis (eg. the sidebar and bucket bar) about
     * the results of anchoring.
     *
     * @param {Anchor[]} anchors
     */
    const sync = anchors => {
      // An annotation is considered to be an orphan if it has at least one
      // target with selectors, and all targets with selectors failed to anchor
      // (i.e. we didn't find it in the page and thus it has no range).
      let hasAnchorableTargets = false;
      let hasAnchoredTargets = false;
      for (let anchor of anchors) {
        if (anchor.target.selector) {
          hasAnchorableTargets = true;
          if (anchor.range) {
            hasAnchoredTargets = true;
            break;
          }
        }
      }
      annotation.$orphan = hasAnchorableTargets && !hasAnchoredTargets;

      // Add the anchors for this annotation to instance storage.
      this.anchors = this.anchors.concat(anchors);

      // Let plugins know about the new information.
      this.plugins.BucketBar?.update();
      this.plugins.CrossFrame?.sync([annotation]);

      return anchors;
    };

    // Remove all the anchors for this annotation from the instance storage.
    for (anchor of this.anchors.splice(0, this.anchors.length)) {
      if (anchor.annotation === annotation) {
        // Anchors are valid as long as they still have a range and their target
        // is still in the list of targets for this annotation.
        if (anchor.range && annotation.target.includes(anchor.target)) {
          anchors.push(anchor);
          anchoredTargets.push(anchor.target);
        } else if (anchor.highlights) {
          // These highlights are no longer valid and should be removed.
          deadHighlights = deadHighlights.concat(anchor.highlights);
          delete anchor.highlights;
          delete anchor.range;
        }
      } else {
        // These can be ignored, so push them back onto the new list.
        this.anchors.push(anchor);
      }
    }

    // Remove all the highlights that have no corresponding target anymore.
    removeHighlights(deadHighlights);

    // Anchor any targets of this annotation that are not anchored already.
    for (let target of annotation.target) {
      if (!anchoredTargets.includes(target)) {
        anchor = locate(target).then(highlight);
        anchors.push(anchor);
      }
    }

    return Promise.all(anchors).then(sync);
  }

  /**
   * Remove the anchors and associated highlights for an annotation from the document.
   *
   * @param {AnnotationData} annotation
   */
  detach(annotation) {
    const anchors = [];
    let unhighlight = [];

    for (let anchor of this.anchors) {
      if (anchor.annotation === annotation) {
        unhighlight.push(...(anchor.highlights ?? []));
      } else {
        anchors.push(anchor);
      }
    }

    this.anchors = anchors;

    removeHighlights(unhighlight);
    this.plugins.BucketBar?.update();
  }

  /**
   * Create a new annotation that is associated with the selected region of
   * the current document.
   *
   * @param {Partial<AnnotationData>} annotation - Initial properties of the
   *   new annotation, other than `target`, `document` and `uri` which are
   *   set by this method.
   */
  createAnnotation(annotation = {}) {
    const root = this.element;

    const ranges = this.selectedRanges ?? [];
    this.selectedRanges = null;

    const getSelectors = range => {
      // Returns an array of selectors for the passed range.
      return this.anchoring.describe(root, range);
    };

    const setDocumentInfo = info => {
      annotation.document = info.metadata;
      annotation.uri = info.uri;
    };

    const setTargets = ([info, selectors]) => {
      // `selectors` is an array of arrays: each item is an array of selectors
      // identifying a distinct target.
      const source = info.uri;
      annotation.target = selectors.map(selector => ({
        source,
        selector,
      }));
    };

    const info = this.getDocumentInfo();
    info.then(setDocumentInfo);

    const selectors = Promise.all(ranges.map(getSelectors));
    const targets = Promise.all([info, selectors]).then(setTargets);

    targets.then(() => this.publish('beforeAnnotationCreated', [annotation]));
    targets.then(() => this.anchor(/** @type {AnnotationData} */ (annotation)));

    if (!annotation.$highlight) {
      this.crossframe?.call('showSidebar');
    }
    return annotation;
  }

  /**
   * Create a new annotation with the `$highlight` flag set.
   *
   * This flag indicates that the sidebar should save the new annotation
   * automatically and not show a form for the user to enter a comment about it.
   */
  createHighlight() {
    return this.createAnnotation({ $highlight: true });
  }

  /**
   * Open the sidebar and set the selection to `annotations` (ie. Filter the annotation
   * list to show only these annotations).
   *
   * @param {AnnotationData[]} annotations
   */
  showAnnotations(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('showAnnotations', tags);
    this.crossframe?.call('showSidebar');
  }

  /**
   * Toggle whether the given annotations are included in the selection in the
   * sidebar.
   *
   * @param {AnnotationData[]} annotations
   */
  toggleAnnotationSelection(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('toggleAnnotationSelection', tags);
  }

  /**
   * Indicate in the sidebar that certain annotations are focused (ie. the
   * associated document region(s) is hovered).
   *
   * @param {AnnotationData[]} annotations
   */
  focusAnnotations(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('focusAnnotations', tags);
  }

  /**
   * Show or hide the adder toolbar when the selection changes.
   *
   * @param {Range} range
   */
  _onSelection(range) {
    const selection = /** @type {Selection} */ (document.getSelection());
    const isBackwards = rangeUtil.isSelectionBackwards(selection);
    const focusRect = rangeUtil.selectionFocusRect(selection);
    if (!focusRect) {
      // The selected range does not contain any text
      this._onClearSelection();
      return;
    }

    this.selectedRanges = [range];
    if (this.toolbar) {
      this.toolbar.newAnnotationType = 'annotation';
    }

    this.adderCtrl.annotationsForSelection = annotationsForSelection();
    this.adderCtrl.show(focusRect, isBackwards);
  }

  _onClearSelection() {
    this.adderCtrl.hide();
    this.selectedRanges = [];
    if (this.toolbar) {
      this.toolbar.newAnnotationType = 'note';
    }
  }

  /**
   * Set the selected annotations in the sidebar.
   *
   * @param {AnnotationData[]} annotations
   * @param {boolean} [toggle]
   */
  selectAnnotations(annotations, toggle = false) {
    if (toggle) {
      this.toggleAnnotationSelection(annotations);
    } else {
      this.showAnnotations(annotations);
    }
  }

  /**
   * Did an event originate from an element in the sidebar UI? (eg. the sidebar
   * iframe, or its toolbar)
   *
   * @param {Event} event
   */
  isEventInAnnotator(event) {
    return (
      /** @type {Element} */ (event.target).closest('.annotator-frame') !== null
    );
  }

  /**
   * Set whether highlights are visible in the document or not.
   *
   * @param {boolean} shouldShowHighlights
   */
  setVisibleHighlights(shouldShowHighlights) {
    setHighlightsVisible(this.element, shouldShowHighlights);

    this.visibleHighlights = shouldShowHighlights;
    if (this.toolbar) {
      this.toolbar.highlightsVisible = shouldShowHighlights;
    }
  }
}
