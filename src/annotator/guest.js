import { ListenerCollection } from '../shared/listener-collection';
import { PortFinder, PortRPC } from '../shared/messaging';
import { generateHexString } from '../shared/random';

import { Adder } from './adder';
import { TextRange } from './anchoring/text-range';
import { BucketBarClient } from './bucket-bar-client';
import { FeatureFlags } from './features';
import {
  getHighlightsContainingNode,
  highlightRange,
  removeAllHighlights,
  removeHighlights,
  setHighlightsFocused,
  setHighlightsVisible,
} from './highlighter';
import { createIntegration } from './integrations';
import * as rangeUtil from './range-util';
import { SelectionObserver, selectedRange } from './selection-observer';
import { findClosestOffscreenAnchor } from './util/buckets';
import { frameFillsAncestor } from './util/frame';
import { normalizeURI } from './util/url';

/**
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Annotator} Annotator
 * @typedef {import('../types/annotator').Anchor} Anchor
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('../types/annotator').SidebarLayout} SidebarLayout
 * @typedef {import('../types/api').Target} Target
 * @typedef {import('../types/port-rpc-events').HostToGuestEvent} HostToGuestEvent
 * @typedef {import('../types/port-rpc-events').GuestToHostEvent} GuestToHostEvent
 * @typedef {import('../types/port-rpc-events').GuestToSidebarEvent} GuestToSidebarEvent
 * @typedef {import('../types/port-rpc-events').SidebarToGuestEvent} SidebarToGuestEvent
 */

/**
 * HTML element created by the highlighter with an associated annotation.
 *
 * @typedef {HTMLElement & { _annotation?: AnnotationData }} AnnotationHighlight
 */

/**
 * Return all the annotations tags associated with the selected text.
 *
 * @return {string[]}
 */
function annotationsForSelection() {
  const selection = /** @type {Selection} */ (window.getSelection());
  const range = selection.getRangeAt(0);
  const tags = rangeUtil.itemsForRange(
    range,
    node => /** @type {AnnotationHighlight} */ (node)._annotation?.$tag
  );
  return tags;
}

/**
 * Return the annotation tags associated with any highlights that contain a given
 * DOM node.
 *
 * @param {Node} node
 * @return {string[]}
 */
function annotationsAt(node) {
  const items = getHighlightsContainingNode(node)
    .map(h => /** @type {AnnotationHighlight} */ (h)._annotation)
    .filter(ann => ann !== undefined)
    .map(ann => ann?.$tag);
  return /** @type {string[]} */ (items);
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

function removeTextSelection() {
  document.getSelection()?.removeAllRanges();
}

/**
 * Subset of the Hypothesis client configuration that is used by {@link Guest}.
 *
 * @typedef GuestConfig
 * @prop {string} [subFrameIdentifier] - An identifier used by this guest to
 *   identify the current frame when communicating with the sidebar. This is
 *   only set in non-host frames.
 * @prop {'jstor'} [contentPartner] - Configures a banner or other indicators
 *   showing where the content has come from.
 */

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
 * each frame connects to the sidebar and host frames as part of its
 * initialization.
 *
 * @implements {Annotator}
 * @implements {Destroyable}
 */
export class Guest {
  /**
   * @param {HTMLElement} element -
   *   The root element in which the `Guest` instance should be able to anchor
   *   or create annotations. In an ordinary web page this typically `document.body`.
   * @param {GuestConfig} [config]
   * @param {Window} [hostFrame] -
   *   Host frame which this guest is associated with. This is expected to be
   *   an ancestor of the guest frame. It may be same or cross origin.
   */
  constructor(element, config = {}, hostFrame = window) {
    this.element = element;
    this._hostFrame = hostFrame;
    this._highlightsVisible = false;
    this._isAdderVisible = false;
    this._informHostOnNextSelectionClear = true;
    /** @type {Range[]} - Ranges of the current text selection. */
    this.selectedRanges = [];

    this._adder = new Adder(this.element, {
      onAnnotate: () => this.createAnnotation(),
      onHighlight: () => this.createAnnotation({ highlight: true }),
      onShowAnnotations: tags => this.selectAnnotations(tags),
    });

    this._selectionObserver = new SelectionObserver(range => {
      if (range) {
        this._onSelection(range);
      } else {
        this._onClearSelection();
      }
    });

    /**
     * The anchors generated by resolving annotation selectors to locations in the
     * document. These are added by `anchor` and removed by `detach`.
     *
     * There is one anchor per annotation `Target`, which typically means one
     * anchor per annotation.
     *
     * @type {Anchor[]}
     */
    this.anchors = [];

    /**
     * Tags of annotations that are currently anchored or being anchored in
     * the guest.
     */
    this._annotations = /** @type {Set<string>} */ (new Set());

    // Set the frame identifier if it's available.
    // The "top" guest instance will have this as null since it's in a top frame not a sub frame
    /** @type {string|null} */
    this._frameIdentifier = config.subFrameIdentifier || null;

    this._portFinder = new PortFinder({
      hostFrame: this._hostFrame,
      source: 'guest',
    });

    this.features = new FeatureFlags();

    /**
     * Integration that handles document-type specific functionality in the
     * guest.
     */
    this._integration = createIntegration(this, {
      contentPartner: config.contentPartner,
    });

    /**
     * Channel for host-guest communication.
     *
     * @type {PortRPC<HostToGuestEvent, GuestToHostEvent>}
     */
    this._hostRPC = new PortRPC();
    this._connectHost(hostFrame);

    /**
     * Channel for guest-sidebar communication.
     *
     * @type {PortRPC<SidebarToGuestEvent, GuestToSidebarEvent>}
     */
    this._sidebarRPC = new PortRPC();
    this._connectSidebar();

    this._bucketBarClient = new BucketBarClient({
      contentContainer: this._integration.contentContainer(),
      hostRPC: this._hostRPC,
    });

    this._sideBySideActive = false;

    // Setup event handlers on the root element
    this._listeners = new ListenerCollection();
    this._setupElementEvents();

    /**
     * Tags of currently focused annotations. This is used to set the focused
     * state correctly for new highlights if the associated annotation is already
     * focused in the sidebar.
     *
     * @type {Set<string>}
     */
    this._focusedAnnotations = new Set();
  }

  // Add DOM event listeners for clicks, taps etc. on the document and
  // highlights.
  _setupElementEvents() {
    // Hide the sidebar in response to a document click or tap, so it doesn't obscure
    // the document content.
    /** @param {Element} element */
    const maybeCloseSidebar = element => {
      if (this._sideBySideActive) {
        // Don't hide the sidebar if event was disabled because the sidebar
        // doesn't overlap the content.
        return;
      }
      if (annotationsAt(element).length) {
        // Don't hide the sidebar if the event comes from an element that contains a highlight
        return;
      }
      this._sidebarRPC.call('closeSidebar');
    };

    this._listeners.add(this.element, 'mouseup', event => {
      const { target, metaKey, ctrlKey } = event;
      const tags = annotationsAt(/** @type {Element} */ (target));
      if (tags.length && this._highlightsVisible) {
        const toggle = metaKey || ctrlKey;
        this.selectAnnotations(tags, toggle);
      }
    });

    this._listeners.add(this.element, 'mousedown', ({ target }) => {
      maybeCloseSidebar(/** @type {Element} */ (target));
    });

    // Allow taps on the document to hide the sidebar as well as clicks.
    // On iOS < 13 (2019), elements like h2 or div don't emit 'click' events.
    this._listeners.add(this.element, 'touchstart', ({ target }) => {
      maybeCloseSidebar(/** @type {Element} */ (target));
    });

    this._listeners.add(this.element, 'mouseover', ({ target }) => {
      const tags = annotationsAt(/** @type {Element} */ (target));
      if (tags.length && this._highlightsVisible) {
        this._sidebarRPC.call('focusAnnotations', tags);
      }
    });

    this._listeners.add(this.element, 'mouseout', () => {
      if (this._highlightsVisible) {
        this._sidebarRPC.call('focusAnnotations', []);
      }
    });

    this._listeners.add(window, 'resize', () => this._repositionAdder());
  }

  /**
   * Retrieve metadata for the current document.
   */
  async getDocumentInfo() {
    const [uri, metadata] = await Promise.all([
      this._integration.uri(),
      this._integration.getMetadata(),
    ]);

    return {
      uri: normalizeURI(uri),
      metadata,
      frameIdentifier: this._frameIdentifier,
    };
  }

  /**
   * Shift the position of the adder on window 'resize' events
   */
  _repositionAdder() {
    if (this._isAdderVisible === false) {
      return;
    }
    const range = window.getSelection()?.getRangeAt(0);
    if (range) {
      this._onSelection(range);
    }
  }

  /** @param {Window} hostFrame */
  async _connectHost(hostFrame) {
    this._hostRPC.on('clearSelection', () => {
      if (selectedRange(document)) {
        this._informHostOnNextSelectionClear = false;
        removeTextSelection();
      }
    });

    this._hostRPC.on('createAnnotation', () => this.createAnnotation());

    this._hostRPC.on(
      'focusAnnotations',
      /** @param {string[]} tags */
      tags => this._focusAnnotations(tags)
    );

    this._hostRPC.on(
      'scrollToClosestOffScreenAnchor',
      /**
       * @param {string[]} tags
       * @param {'down'|'up'} direction
       */
      (tags, direction) => this._scrollToClosestOffScreenAnchor(tags, direction)
    );

    this._hostRPC.on(
      'selectAnnotations',
      /**
       * @param {string[]} tags
       * @param {boolean} toggle
       */
      (tags, toggle) => this.selectAnnotations(tags, toggle)
    );

    this._hostRPC.on(
      'sidebarLayoutChanged',
      /** @param {SidebarLayout} sidebarLayout */
      sidebarLayout => {
        if (frameFillsAncestor(window, hostFrame)) {
          this.fitSideBySide(sidebarLayout);
        }
      }
    );

    // Discover and connect to the host frame. All RPC events must be
    // registered before creating the channel.
    const hostPort = await this._portFinder.discover('host');
    this._hostRPC.connect(hostPort);
  }

  async _connectSidebar() {
    this._sidebarRPC.on(
      'featureFlagsUpdated',
      /** @param {Record<string, boolean>} flags */ flags =>
        this.features.update(flags)
    );

    // Handlers for events sent when user hovers or clicks on an annotation card
    // in the sidebar.
    this._sidebarRPC.on(
      'focusAnnotations',
      /** @param {string[]} tags */
      tags => this._focusAnnotations(tags)
    );

    this._sidebarRPC.on(
      'scrollToAnnotation',
      /** @param {string} tag */
      tag => {
        const anchor = this.anchors.find(a => a.annotation.$tag === tag);
        if (!anchor?.highlights) {
          return;
        }
        const range = resolveAnchor(anchor);
        if (!range) {
          return;
        }

        // Emit a custom event that the host page can respond to. This is useful,
        // for example, if the highlighted content is contained in a collapsible
        // section of the page that needs to be un-collapsed.
        const event = new CustomEvent('scrolltorange', {
          bubbles: true,
          cancelable: true,
          detail: range,
        });
        const defaultNotPrevented = this.element.dispatchEvent(event);

        if (defaultNotPrevented) {
          this._integration.scrollToAnchor(anchor);
        }
      }
    );

    // Handler for controls on the sidebar
    this._sidebarRPC.on(
      'setHighlightsVisible',
      /** @param {boolean} showHighlights */ showHighlights => {
        this.setHighlightsVisible(showHighlights);
      }
    );

    this._sidebarRPC.on(
      'deleteAnnotation',
      /** @param {string} tag */
      tag => this.detach(tag)
    );

    this._sidebarRPC.on(
      'loadAnnotations',
      /** @param {AnnotationData[]} annotations */
      annotations => annotations.forEach(annotation => this.anchor(annotation))
    );

    // Connect to sidebar and send document info/URIs to it.
    //
    // RPC calls are deferred until a connection is made, so these steps can
    // complete in either order.
    this._portFinder.discover('sidebar').then(port => {
      this._sidebarRPC.connect(port);
    });
    this.getDocumentInfo().then(metadata =>
      this._sidebarRPC.call('documentInfoChanged', metadata)
    );
  }

  destroy() {
    this._portFinder.destroy();
    this._hostRPC.destroy();
    this._sidebarRPC.destroy();

    this._listeners.removeAll();

    this._selectionObserver.disconnect();
    this._adder.destroy();
    this._bucketBarClient.destroy();

    removeAllHighlights(this.element);

    this._integration.destroy();
  }

  /**
   * Anchor an annotation's selectors in the document.
   *
   * _Anchoring_ resolves a set of selectors to a concrete region of the document
   * which is then highlighted.
   *
   * Any existing anchors associated with `annotation` will be removed before
   * re-anchoring the annotation.
   *
   * @param {AnnotationData} annotation
   * @return {Promise<Anchor[]>}
   */
  async anchor(annotation) {
    /**
     * Resolve an annotation's selectors to a concrete range.
     *
     * @param {Target} target
     * @return {Promise<Anchor>}
     */
    const locate = async target => {
      // Only annotations with an associated quote can currently be anchored.
      // This is because the quote is used to verify anchoring with other selector
      // types.
      if (
        !target.selector ||
        !target.selector.some(s => s.type === 'TextQuoteSelector')
      ) {
        return { annotation, target };
      }

      /** @type {Anchor} */
      let anchor;
      try {
        const range = await this._integration.anchor(
          this.element,
          target.selector
        );
        // Convert the `Range` to a `TextRange` which can be converted back to
        // a `Range` later. The `TextRange` representation allows for highlights
        // to be inserted during anchoring other annotations without "breaking"
        // this anchor.
        const textRange = TextRange.fromRange(range);
        anchor = { annotation, target, range: textRange };
      } catch (err) {
        anchor = { annotation, target };
      }
      return anchor;
    };

    /**
     * Highlight the text range that `anchor` refers to.
     *
     * @param {Anchor} anchor
     */
    const highlight = anchor => {
      const range = resolveAnchor(anchor);
      if (!range) {
        return;
      }

      const highlights = /** @type {AnnotationHighlight[]} */ (
        highlightRange(range)
      );
      highlights.forEach(h => {
        h._annotation = anchor.annotation;
      });
      anchor.highlights = highlights;

      if (this._focusedAnnotations.has(anchor.annotation.$tag)) {
        setHighlightsFocused(highlights, true);
      }
    };

    // Remove existing anchors for this annotation.
    this.detach(annotation.$tag, false /* notify */);

    this._annotations.add(annotation.$tag);

    // Resolve selectors to ranges and insert highlights.
    if (!annotation.target) {
      annotation.target = [];
    }
    const anchors = await Promise.all(annotation.target.map(locate));

    // If the annotation was removed while anchoring, don't save the anchors.
    if (!this._annotations.has(annotation.$tag)) {
      return [];
    }

    for (let anchor of anchors) {
      highlight(anchor);
    }

    // Set flag indicating whether anchoring succeeded. For each target,
    // anchoring is successful either if there are no selectors (ie. this is a
    // Page Note) or we successfully resolved the selectors to a range.
    annotation.$orphan =
      anchors.length > 0 &&
      anchors.every(anchor => anchor.target.selector && !anchor.range);

    this._updateAnchors(this.anchors.concat(anchors), true /* notify */);

    // Let other frames (eg. the sidebar) know about the new annotation.
    this._sidebarRPC.call('syncAnchoringStatus', annotation);

    return anchors;
  }

  /**
   * Remove the anchors and associated highlights for an annotation from the document.
   *
   * @param {string} tag
   * @param {boolean} [notify] - For internal use. Whether to inform the host
   *   frame about the removal of an anchor.
   */
  detach(tag, notify = true) {
    this._annotations.delete(tag);

    /** @type {Anchor[]} */
    const anchors = [];
    for (let anchor of this.anchors) {
      if (anchor.annotation.$tag !== tag) {
        anchors.push(anchor);
      } else if (anchor.highlights) {
        removeHighlights(anchor.highlights);
      }
    }
    this._updateAnchors(anchors, notify);
  }

  /**
   * @param {Anchor[]} anchors
   * @param {boolean} notify
   */
  _updateAnchors(anchors, notify) {
    this.anchors = anchors;
    if (notify) {
      this._bucketBarClient.update(this.anchors);
    }
  }

  /**
   * Create a new annotation that is associated with the selected region of
   * the current document.
   *
   * @param {object} options
   *   @param {boolean} [options.highlight] - If true, the new annotation has
   *     the `$highlight` flag set, causing it to be saved immediately without
   *     prompting for a comment.
   * @return {Promise<AnnotationData>} - The new annotation
   */
  async createAnnotation({ highlight = false } = {}) {
    const ranges = this.selectedRanges;
    this.selectedRanges = [];

    const info = await this.getDocumentInfo();
    const root = this.element;
    const rangeSelectors = await Promise.all(
      ranges.map(range => this._integration.describe(root, range))
    );
    const target = rangeSelectors.map(selectors => ({
      source: info.uri,

      // In the Hypothesis API the field containing the selectors is called
      // `selector`, despite being a list.
      selector: selectors,
    }));

    /** @type {AnnotationData} */
    const annotation = {
      uri: info.uri,
      document: info.metadata,
      target,
      $highlight: highlight,
      $tag: 'a:' + generateHexString(8),
    };

    this._sidebarRPC.call('createAnnotation', annotation);
    this.anchor(annotation);

    // Removing the text selection triggers the `SelectionObserver` callback,
    // which causes the adder to be removed after some delay.
    removeTextSelection();

    return annotation;
  }

  /**
   * Indicate in the sidebar that certain annotations are focused (ie. the
   * associated document region(s) is hovered).
   *
   * @param {string[]} tags
   */
  _focusAnnotations(tags) {
    this._focusedAnnotations.clear();
    tags.forEach(tag => this._focusedAnnotations.add(tag));

    for (let anchor of this.anchors) {
      if (anchor.highlights) {
        const toggle = tags.includes(anchor.annotation.$tag);
        setHighlightsFocused(anchor.highlights, toggle);
      }
    }

    this._sidebarRPC.call('focusAnnotations', tags);
  }

  /**
   * Scroll to the closest off screen anchor.
   *
   * @param {string[]} tags
   * @param {'down'|'up'} direction
   */
  _scrollToClosestOffScreenAnchor(tags, direction) {
    const anchors = this.anchors.filter(({ annotation }) =>
      tags.includes(annotation.$tag)
    );
    const closest = findClosestOffscreenAnchor(anchors, direction);
    if (closest) {
      this._integration.scrollToAnchor(closest);
    }
  }

  /**
   * Show or hide the adder toolbar when the selection changes.
   *
   * @param {Range} range
   */
  _onSelection(range) {
    if (!this._integration.canAnnotate(range)) {
      this._onClearSelection();
      return;
    }

    const selection = /** @type {Selection} */ (document.getSelection());
    const isBackwards = rangeUtil.isSelectionBackwards(selection);
    const focusRect = rangeUtil.selectionFocusRect(selection);
    if (!focusRect) {
      // The selected range does not contain any text
      this._onClearSelection();
      return;
    }

    this.selectedRanges = [range];
    this._hostRPC.call('textSelected');

    this._adder.annotationsForSelection = annotationsForSelection();
    this._isAdderVisible = true;
    this._adder.show(focusRect, isBackwards);
  }

  _onClearSelection() {
    this._isAdderVisible = false;
    this._adder.hide();
    this.selectedRanges = [];
    if (this._informHostOnNextSelectionClear) {
      this._hostRPC.call('textUnselected');
    }
    this._informHostOnNextSelectionClear = true;
  }

  /**
   * Show the given annotations in the sidebar.
   *
   * This sets up a filter in the sidebar to show only the selected annotations
   * and opens the sidebar.
   *
   * @param {string[]} tags
   * @param {boolean} [toggle] - Toggle whether the annotations are selected
   *   instead of showing them regardless of whether they are currently selected.
   */
  selectAnnotations(tags, toggle = false) {
    if (toggle) {
      this._sidebarRPC.call('toggleAnnotationSelection', tags);
    } else {
      this._sidebarRPC.call('showAnnotations', tags);
    }
    this._sidebarRPC.call('openSidebar');
  }

  /**
   * Set whether highlights are visible in the document or not.
   *
   * @param {boolean} visible
   */
  setHighlightsVisible(visible) {
    setHighlightsVisible(this.element, visible);
    this._highlightsVisible = visible;
  }

  /**
   * Attempt to fit the document content alongside the sidebar.
   *
   * @param {SidebarLayout} sidebarLayout
   */
  fitSideBySide(sidebarLayout) {
    this._sideBySideActive = this._integration.fitSideBySide(sidebarLayout);
  }

  /**
   * Return true if side-by-side mode is currently active.
   *
   * Side-by-side mode is activated or de-activated when `fitSideBySide` is called
   * depending on whether the sidebar is expanded and whether there is room for
   * the content alongside the sidebar.
   */
  get sideBySideActive() {
    return this._sideBySideActive;
  }

  /**
   * Return the tags of annotations that are currently displayed in a focused
   * state.
   *
   * @return {Set<string>}
   */
  get focusedAnnotationTags() {
    return this._focusedAnnotations;
  }
}
