import CustomEvent from 'custom-event';
import $ from 'jquery';
import scrollIntoView from 'scroll-into-view';

import Delegator from './delegator';
import * as adder from './adder';

// @ts-expect-error - Module is CoffeeScript
import * as htmlAnchoring from './anchoring/html';
// @ts-expect-error - Module is CoffeeScript
import * as xpathRange from './anchoring/range';

import * as highlighter from './highlighter';
import * as rangeUtil from './range-util';
import selections from './selections';
import { closest } from '../shared/dom-element';
import { normalizeURI } from './util/url';

/**
 * @typedef {import('./toolbar').ToolbarController} ToolbarController
 */

const animationPromise = fn =>
  new Promise((resolve, reject) =>
    requestAnimationFrame(() => {
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    })
  );

function annotationsForSelection() {
  const selection = /** @type {Selection} */ (window.getSelection());
  const range = selection.getRangeAt(0);
  return rangeUtil.itemsForRange(range, node => $(node).data('annotation'));
}

/**
 * Return the annotations associated with any highlights that contain a given
 * DOM node.
 */
function annotationsAt(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentElement;
  }

  const highlights = [];

  while (node) {
    if (node.classList.contains('hypothesis-highlight')) {
      highlights.push(node);
    }
    node = node.parentElement;
  }

  return highlights.map(h => $(h).data('annotation'));
}

// A selector which matches elements added to the DOM by Hypothesis (eg. for
// highlights and annotation UI).
//
// We can simplify this once all classes are converted from an "annotator-"
// prefix to a "hypothesis-" prefix.
const IGNORE_SELECTOR = '[class^="annotator-"],[class^="hypothesis-"]';

export default class Guest extends Delegator {
  constructor(element, config, anchoring = htmlAnchoring) {
    // TODO - Find out if `defaultConfig` actually does anything and remove it
    // if not.
    const defaultConfig = {
      Document: {},
      TextSelection: {},
    };

    super(element, { ...defaultConfig, ...config });

    this.visibleHighlights = false;

    /** @type {ToolbarController|null} */
    this.toolbar = null;

    this.adder = $(`<hypothesis-adder></hypothesis-adder>`)
      .appendTo(this.element)
      .hide();

    this.adderCtrl = new adder.Adder(this.adder[0], {
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
    this.selections = selections(document).subscribe({
      next: range => {
        if (range) {
          this._onSelection(range);
        } else {
          this._onClearSelection();
        }
      },
    });

    this.plugins = {};
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
    for (let name of Object.keys(this.options || {})) {
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
      this.element[0].addEventListener(event, callback);
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
      this.element[0].removeEventListener(event, callback);
    });
  }

  addPlugin(name, options) {
    if (this.plugins[name]) {
      console.error('You cannot have more than one instance of any plugin.');
    } else {
      const Klass = this.options.pluginClasses[name];
      if (typeof Klass === 'function') {
        this.plugins[name] = new Klass(this.element[0], options);
        this.plugins[name].annotator = this;
        this.plugins[name].pluginInit?.();
      } else {
        console.error(
          'Could not load ' +
            name +
            ' plugin. Have you included the appropriate <script> tag?'
        );
      }
    }
    return this; // allow chaining
  }

  // Get the document info
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
          $(anchor.highlights).toggleClass(
            'hypothesis-highlight-focused',
            toggle
          );
        }
      }
    });

    crossframe.on('scrollToAnnotation', tag => {
      for (let anchor of this.anchors) {
        if (anchor.highlights) {
          if (anchor.annotation.$tag === tag) {
            const event = new CustomEvent('scrolltorange', {
              bubbles: true,
              cancelable: true,
              detail: anchor.range,
            });
            const defaultNotPrevented = this.element[0].dispatchEvent(event);
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
    this.selections.unsubscribe();
    this.adder.remove();

    this.element.find('.hypothesis-highlight').each(function () {
      $(this).contents().insertBefore(this);
      $(this).remove();
    });

    this.element.data('annotator', null);

    for (let name of Object.keys(this.plugins)) {
      this.plugins[name].destroy();
    }

    super.destroy();
  }

  anchor(annotation) {
    let anchor;
    const root = this.element[0];

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

    const locate = target => {
      // Check that the anchor has a TextQuoteSelector -- without a
      // TextQuoteSelector we have no basis on which to verify that we have
      // reanchored correctly and so we shouldn't even try.
      //
      // Returning an anchor without a range will result in this annotation being
      // treated as an orphan (assuming no other targets anchor).
      if (!(target.selector ?? []).some(s => s.type === 'TextQuoteSelector')) {
        return Promise.resolve({ annotation, target });
      }

      // Find a target using the anchoring module.
      const options = {
        ignoreSelector: IGNORE_SELECTOR,
      };
      return this.anchoring
        .anchor(root, target.selector, options)
        .then(range => ({
          annotation,
          target,
          range,
        }))
        .catch(() => ({
          annotation,
          target,
        }));
    };

    // Highlight the range for an anchor.
    const highlight = anchor => {
      if (!anchor.range) {
        return anchor;
      }
      return animationPromise(() => {
        const range = xpathRange.sniff(anchor.range);
        const normedRange = range.normalize(root);
        const highlights = highlighter.highlightRange(normedRange);

        $(highlights).data('annotation', anchor.annotation);
        anchor.highlights = highlights;
        return anchor;
      });
    };

    // Store the results of anchoring.
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
    requestAnimationFrame(() => highlighter.removeHighlights(deadHighlights));

    // Anchor any targets of this annotation that are not anchored already.
    for (let target of annotation.target) {
      if (!anchoredTargets.includes(target)) {
        anchor = locate(target).then(highlight);
        anchors.push(anchor);
      }
    }

    return Promise.all(anchors).then(sync);
  }

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

    requestAnimationFrame(() => {
      highlighter.removeHighlights(unhighlight);
      this.plugins.BucketBar?.update();
    });
  }

  createAnnotation(annotation = {}) {
    const root = this.element[0];

    const ranges = this.selectedRanges ?? [];
    this.selectedRanges = null;

    const getSelectors = range => {
      const options = {
        ignoreSelector: IGNORE_SELECTOR,
      };
      // Returns an array of selectors for the passed range.
      return this.anchoring.describe(root, range, options);
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
    targets.then(() => this.anchor(annotation));

    if (!annotation.$highlight) {
      this.crossframe?.call('showSidebar');
    }
    return annotation;
  }

  createHighlight() {
    return this.createAnnotation({ $highlight: true });
  }

  // Create a blank comment (AKA "page note")
  createComment() {
    const annotation = {};

    const prepare = info => {
      annotation.document = info.metadata;
      annotation.uri = info.uri;
      annotation.target = [{ source: info.uri }];
    };

    this.getDocumentInfo()
      .then(prepare)
      .then(() => this.publish('beforeAnnotationCreated', [annotation]));

    return annotation;
  }

  // Public: Deletes the annotation by removing the highlight from the DOM.
  // Publishes the 'annotationDeleted' event on completion.
  //
  // annotation - An annotation Object to delete.
  //
  // Returns deleted annotation.
  deleteAnnotation(annotation) {
    if (annotation.highlights) {
      for (let h of annotation.highlights) {
        if (h.parentNode !== null) {
          $(h).replaceWith(h.childNodes);
        }
      }
    }

    this.publish('annotationDeleted', [annotation]);
  }

  showAnnotations(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('showAnnotations', tags);
    this.crossframe?.call('showSidebar');
  }

  toggleAnnotationSelection(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('toggleAnnotationSelection', tags);
  }

  updateAnnotations(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('updateAnnotations', tags);
  }

  focusAnnotations(annotations) {
    const tags = annotations.map(a => a.$tag);
    this.crossframe?.call('focusAnnotations', tags);
  }

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

    const { left, top, arrowDirection } = this.adderCtrl.target(
      focusRect,
      isBackwards
    );
    this.adderCtrl.annotationsForSelection = annotationsForSelection();
    this.adderCtrl.showAt(left, top, arrowDirection);
  }

  _onClearSelection() {
    this.adderCtrl.hide();
    this.selectedRanges = [];
    if (this.toolbar) {
      this.toolbar.newAnnotationType = 'note';
    }
  }

  selectAnnotations(annotations, toggle) {
    if (toggle) {
      this.toggleAnnotationSelection(annotations);
    } else {
      this.showAnnotations(annotations);
    }
  }

  // Did an event originate from an element in the annotator UI? (eg. the sidebar
  // frame, or its toolbar)
  isEventInAnnotator(event) {
    return closest(event.target, '.annotator-frame') !== null;
  }

  // Pass true to show the highlights in the frame or false to disable.
  setVisibleHighlights(shouldShowHighlights) {
    this.toggleHighlightClass(shouldShowHighlights);
  }

  toggleHighlightClass(shouldShowHighlights) {
    const showHighlightsClass = 'hypothesis-highlights-always-on';
    if (shouldShowHighlights) {
      this.element.addClass(showHighlightsClass);
    } else {
      this.element.removeClass(showHighlightsClass);
    }

    this.visibleHighlights = shouldShowHighlights;
    if (this.toolbar) {
      this.toolbar.highlightsVisible = shouldShowHighlights;
    }
  }
}
