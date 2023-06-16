import { TinyEmitter } from 'tiny-emitter';

import { ListenerCollection } from '../shared/listener-collection';
import { PortFinder, PortRPC } from '../shared/messaging';
import { generateHexString } from '../shared/random';
import { matchShortcut } from '../shared/shortcut';
import type {
  AnnotationData,
  Annotator,
  Anchor,
  ContentInfoConfig,
  Destroyable,
  DocumentInfo,
  Integration,
  SidebarLayout,
} from '../types/annotator';
import type { Target } from '../types/api';
import type {
  HostToGuestEvent,
  GuestToHostEvent,
  GuestToSidebarEvent,
  SidebarToGuestEvent,
} from '../types/port-rpc-events';
import { Adder } from './adder';
import { TextRange } from './anchoring/text-range';
import { BucketBarClient } from './bucket-bar-client';
import { LayoutChangeEvent } from './events';
import { FeatureFlags } from './features';
import { HighlightClusterController } from './highlight-clusters';
import {
  getHighlightsContainingNode,
  highlightRange,
  removeAllHighlights,
  removeHighlights,
  setHighlightsFocused,
  setHighlightsVisible,
} from './highlighter';
import { createIntegration } from './integrations';
import {
  itemsForRange,
  isSelectionBackwards,
  selectionFocusRect,
  selectedRange,
} from './range-util';
import { SelectionObserver } from './selection-observer';
import { frameFillsAncestor } from './util/frame';
import { normalizeURI } from './util/url';

/** HTML element created by the highlighter with an associated annotation. */
type AnnotationHighlight = HTMLElement & { _annotation?: AnnotationData };

/** Return all the annotations tags associated with the selected text. */
function annotationsForSelection(): string[] {
  const tags = itemsForRange(
    selectedRange() ?? new Range(),
    node => (node as AnnotationHighlight)._annotation?.$tag
  );
  return tags;
}

/**
 * Return the annotation tags associated with any highlights that contain a given
 * DOM node.
 */
function annotationsAt(node: Node): string[] {
  const items = getHighlightsContainingNode(node)
    .map(h => (h as AnnotationHighlight)._annotation)
    .filter(ann => ann !== undefined)
    .map(ann => ann?.$tag);
  return items as string[];
}

/**
 * Resolve an anchor's associated document region to a concrete `Range`.
 *
 * This may fail if anchoring failed or if the document has been mutated since
 * the anchor was created in a way that invalidates the anchor.
 */
function resolveAnchor(anchor: Anchor): Range | null {
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
 */
export type GuestConfig = {
  /**
   * An identifier used by this guest to identify the current frame when
   * communicating with the sidebar. This is only set in non-host frames.
   */
  subFrameIdentifier?: string;

  /** Configures a banner or other indicators showing where the content has come from. */
  contentInfoBanner?: ContentInfoConfig;
};

/**
 * Event dispatched by the client when it is about to scroll a highlight into
 * view.
 *
 * The host page can listen for this event in order to reveal the content if
 * not already visible. If the content will be revealed asynchronously,
 * {@link waitUntil} can be used to notify the client when it is ready.
 *
 * For more flexibility the host page can completely take over scrolling to the
 * range by calling {@link Event.preventDefault} on the event.
 */
export class ScrollToRangeEvent extends CustomEvent<Range> {
  private _ready: Promise<void> | null;

  /**
   * @param range - The DOM range that Hypothesis will scroll into view.
   */
  constructor(range: Range) {
    super('scrolltorange', {
      bubbles: true,
      cancelable: true,
      detail: range,
    });

    this._ready = null;
  }

  /**
   * If scrolling was deferred using {@link waitUntil}, returns the promise
   * that must resolve before the highlight is scrolled to.
   */
  get ready(): Promise<void> | null {
    return this._ready;
  }

  /**
   * Provide Hypothesis with a promise that resolves when the content
   * associated with the event's range is ready to be scrolled into view.
   */
  waitUntil(ready: Promise<void>) {
    this._ready = ready;
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
 * each frame connects to the sidebar and host frames as part of its
 * initialization.
 */
export class Guest extends TinyEmitter implements Annotator, Destroyable {
  public element: HTMLElement;

  /** Ranges of the current text selection. */
  public selectedRanges: Range[];

  /**
   * The anchors generated by resolving annotation selectors to locations in the
   * document. These are added by `anchor` and removed by `detach`.
   *
   * There is one anchor per annotation `Target`, which typically means one
   * anchor per annotation.
   */
  public anchors: Anchor[];

  public features: FeatureFlags;

  /** Promise that resolves when feature flags are received from the sidebar. */
  private _featureFlagsReceived: Promise<void>;

  private _adder: Adder;
  private _clusterToolbar?: HighlightClusterController;
  private _hostFrame: Window;
  private _highlightsVisible: boolean;
  private _isAdderVisible: boolean;
  private _informHostOnNextSelectionClear: boolean;
  private _selectionObserver: SelectionObserver;

  /**
   * Tags of annotations that are currently anchored or being anchored in
   * the guest.
   */
  private _annotations: Set<string>;
  private _frameIdentifier: string | null;
  private _portFinder: PortFinder;

  /**
   * Integration that handles document-type specific functionality in the
   * guest.
   */
  private _integration: Integration;

  /** Channel for host-guest communication. */
  private _hostRPC: PortRPC<HostToGuestEvent, GuestToHostEvent>;

  /** Channel for guest-sidebar communication. */
  private _sidebarRPC: PortRPC<SidebarToGuestEvent, GuestToSidebarEvent>;

  private _bucketBarClient: BucketBarClient;

  private _sideBySideActive: boolean;
  private _listeners: ListenerCollection;

  /**
   * Tags of currently hovered annotations. This is used to set the hovered
   * state correctly for new highlights if the associated annotation is already
   * hovered in the sidebar.
   */
  private _hoveredAnnotations: Set<string>;

  /**
   * @param element -
   *   The root element in which the `Guest` instance should be able to anchor
   *   or create annotations. In an ordinary web page this typically `document.body`.
   * @param [config]
   * @param [hostFrame] -
   *   Host frame which this guest is associated with. This is expected to be
   *   an ancestor of the guest frame. It may be same or cross origin.
   */
  constructor(
    element: HTMLElement,
    config: GuestConfig = {},
    hostFrame: Window = window
  ) {
    super();

    this.element = element;
    this._hostFrame = hostFrame;
    this._highlightsVisible = false;
    this._isAdderVisible = false;
    this._informHostOnNextSelectionClear = true;
    this.selectedRanges = [];

    this._adder = new Adder(this.element, {
      onAnnotate: () => this.createAnnotation(),
      onHighlight: () => this.createAnnotation({ highlight: true }),

      // When the "Show" button is triggered, open the sidebar and select the
      // annotations. Also give keyboard focus to the first selected annotation.
      // This is an important affordance for eg. screen reader users as it gives
      // them an efficient way to navigate from highlights in the document to
      // the corresponding comments in the sidebar.
      onShowAnnotations: tags =>
        this.selectAnnotations(tags, { focusInSidebar: true }),
    });

    this._selectionObserver = new SelectionObserver(range => {
      if (range) {
        this._onSelection(range);
      } else {
        this._onClearSelection();
      }
    });

    this.anchors = [];
    this._annotations = new Set();

    // Set the frame identifier if it's available.
    // The "top" guest instance will have this as null since it's in a top frame not a sub frame
    this._frameIdentifier = config.subFrameIdentifier || null;

    this._portFinder = new PortFinder({
      hostFrame: this._hostFrame,
      source: 'guest',
      sourceId: this._frameIdentifier ?? undefined,
    });

    this.features = new FeatureFlags();
    this._featureFlagsReceived = new Promise(resolve => {
      this.features.on('flagsChanged', resolve);
    });

    this._integration = createIntegration(this);
    this._integration.on('uriChanged', () => this._sendDocumentInfo());
    if (config.contentInfoBanner) {
      this._integration.showContentInfo?.(config.contentInfoBanner);
    }

    if (this._integration.canStyleClusteredHighlights?.()) {
      this._clusterToolbar = new HighlightClusterController(
        this._integration.contentContainer(),
        {
          features: this.features,
        }
      );
    }

    this._hostRPC = new PortRPC();
    this._connectHost(hostFrame);

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

    this._hoveredAnnotations = new Set();
  }

  // Add DOM event listeners for clicks, taps etc. on the document and
  // highlights.
  _setupElementEvents() {
    // Hide the sidebar in response to a document click or tap, so it doesn't obscure
    // the document content.
    //
    // Hypothesis UI elements (`<hypothesis->`) have logic to prevent clicks in
    // them from propagating out of their shadow roots, and hence clicking on
    // elements in the sidebar's vertical toolbar or adder won't close the
    // sidebar.
    const maybeCloseSidebar = (element: Element) => {
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
      const tags = annotationsAt(target as Element);
      if (tags.length && this._highlightsVisible) {
        const toggle = metaKey || ctrlKey;
        this.selectAnnotations(tags, { toggle });
      }
    });

    this._listeners.add(this.element, 'mousedown', ({ target }) => {
      maybeCloseSidebar(target as Element);
    });

    // Allow taps on the document to hide the sidebar as well as clicks.
    // On iOS < 13 (2019), elements like h2 or div don't emit 'click' events.
    this._listeners.add(this.element, 'touchstart', ({ target }) => {
      maybeCloseSidebar(target as Element);
    });

    this._listeners.add(this.element, 'mouseover', ({ target }) => {
      const tags = annotationsAt(target as Element);
      if (tags.length && this._highlightsVisible) {
        this._sidebarRPC.call('hoverAnnotations', tags);
      }
    });

    this._listeners.add(this.element, 'mouseout', () => {
      if (this._highlightsVisible) {
        this._sidebarRPC.call('hoverAnnotations', []);
      }
    });

    this._listeners.add(this.element, 'keydown', event => {
      this._handleShortcut(event);
    });

    this._listeners.add(window, 'resize', () => this._repositionAdder());
  }

  /**
   * Retrieve metadata for the current document.
   */
  async getDocumentInfo(): Promise<DocumentInfo> {
    const [uri, metadata, segmentInfo] = await Promise.all([
      this._integration.uri(),
      this._integration.getMetadata(),
      this._integration.segmentInfo?.(),
    ]);

    return {
      uri: normalizeURI(uri),
      metadata,
      segmentInfo,
      persistent: this._integration.persistFrame?.() ?? false,
    };
  }

  /** Send the current document URI and metadata to the sidebar. */
  async _sendDocumentInfo() {
    if (this._integration.waitForFeatureFlags?.()) {
      await this._featureFlagsReceived;
    }
    const metadata = await this.getDocumentInfo();
    this._sidebarRPC.call('documentInfoChanged', metadata);
  }

  /**
   * Shift the position of the adder on window 'resize' events
   */
  _repositionAdder() {
    if (!this._isAdderVisible) {
      return;
    }
    const range = selectedRange();
    if (range) {
      this._onSelection(range);
    }
  }

  async _connectHost(hostFrame: Window) {
    this._hostRPC.on('clearSelection', () => {
      if (selectedRange()) {
        this._informHostOnNextSelectionClear = false;
        removeTextSelection();
      }
    });

    this._hostRPC.on('createAnnotation', () => this.createAnnotation());

    this._hostRPC.on('hoverAnnotations', (tags: string[]) =>
      this._hoverAnnotations(tags)
    );

    this._hostRPC.on('scrollToAnnotation', (tag: string) => {
      this._scrollToAnnotation(tag);
    });

    this._hostRPC.on('selectAnnotations', (tags: string[], toggle: boolean) =>
      this.selectAnnotations(tags, { toggle })
    );

    this._hostRPC.on('sidebarLayoutChanged', (sidebarLayout: SidebarLayout) => {
      if (frameFillsAncestor(window, hostFrame)) {
        this.fitSideBySide(sidebarLayout);
      }

      // Emit a custom event that the host page can respond to. This is useful
      // if the host app needs to change its layout depending on the sidebar's
      // visibility and size.
      this.element.dispatchEvent(
        new LayoutChangeEvent({
          sidebarLayout,
          sideBySideActive: this._sideBySideActive,
        })
      );
    });

    this._hostRPC.on('close', () => this.emit('hostDisconnected'));

    // Discover and connect to the host frame. All RPC events must be
    // registered before creating the channel.
    const hostPort = await this._portFinder.discover('host');
    this._hostRPC.connect(hostPort);
  }

  /**
   * Scroll an anchor into view and notify the host page.
   *
   * Returns a promise that resolves when scrolling has completed. See
   * {@link Integration.scrollToAnchor}.
   */
  private async _scrollToAnchor(anchor: Anchor) {
    const range = resolveAnchor(anchor);
    if (!range) {
      return;
    }

    // Emit a custom event that the host page can respond to. This is useful
    // if the content is in a hidden section of the page that needs to be
    // revealed before it can be scrolled to.
    const event = new ScrollToRangeEvent(range);

    const defaultNotPrevented = this.element.dispatchEvent(event);

    if (defaultNotPrevented) {
      await event.ready;
      await this._integration.scrollToAnchor(anchor);
    }
  }

  private async _scrollToAnnotation(tag: string) {
    const anchor = this.anchors.find(a => a.annotation.$tag === tag);
    if (!anchor?.highlights) {
      return;
    }
    this._scrollToAnchor(anchor);
  }

  async _connectSidebar() {
    this._sidebarRPC.on(
      'featureFlagsUpdated',
      (flags: Record<string, boolean>) => this.features.update(flags)
    );

    // Handlers for events sent when user hovers or clicks on an annotation card
    // in the sidebar.
    this._sidebarRPC.on('hoverAnnotations', (tags: string[]) =>
      this._hoverAnnotations(tags)
    );

    this._sidebarRPC.on('scrollToAnnotation', (tag: string) => {
      this._scrollToAnnotation(tag);
    });

    // Handler for controls on the sidebar
    this._sidebarRPC.on('setHighlightsVisible', (showHighlights: boolean) => {
      this.setHighlightsVisible(showHighlights, false /* notifyHost */);
    });

    this._sidebarRPC.on('deleteAnnotation', (tag: string) => this.detach(tag));

    this._sidebarRPC.on('loadAnnotations', (annotations: AnnotationData[]) =>
      annotations.forEach(annotation => this.anchor(annotation))
    );

    this._sidebarRPC.on('showContentInfo', (info: ContentInfoConfig) =>
      this._integration.showContentInfo?.(info)
    );

    this._sidebarRPC.on('navigateToSegment', (annotation: AnnotationData) =>
      this._integration.navigateToSegment?.(annotation)
    );

    // Connect to sidebar and send document info/URIs to it.
    //
    // RPC calls are deferred until a connection is made, so these steps can
    // complete in either order.
    this._portFinder.discover('sidebar').then(port => {
      this._sidebarRPC.connect(port);
    });

    this._sendDocumentInfo();
  }

  destroy() {
    this._portFinder.destroy();
    this._hostRPC.destroy();
    this._sidebarRPC.destroy();

    this._listeners.removeAll();

    this._selectionObserver.disconnect();
    this._adder.destroy();
    this._bucketBarClient.destroy();
    this._clusterToolbar?.destroy();

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
   */
  async anchor(annotation: AnnotationData): Promise<Anchor[]> {
    /**
     * Resolve an annotation's selectors to a concrete range.
     */
    const locate = async (target: Target): Promise<Anchor> => {
      // Only annotations with an associated quote can currently be anchored.
      // This is because the quote is used to verify anchoring with other selector
      // types.
      if (
        !target.selector ||
        !target.selector.some(s => s.type === 'TextQuoteSelector')
      ) {
        return { annotation, target };
      }

      let anchor: Anchor;
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
     */
    const highlight = (anchor: Anchor) => {
      const range = resolveAnchor(anchor);
      if (!range) {
        return;
      }

      const highlights = highlightRange(
        range,
        anchor.annotation?.$cluster /* cssClass */
      ) as AnnotationHighlight[];
      highlights.forEach(h => {
        h._annotation = anchor.annotation;
      });
      anchor.highlights = highlights;

      if (this._hoveredAnnotations.has(anchor.annotation.$tag)) {
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

    for (const anchor of anchors) {
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
   * @param [notify] - For internal use. Whether to inform the host
   *   frame about the removal of an anchor.
   */
  detach(tag: string, notify = true) {
    this._annotations.delete(tag);

    const anchors = [] as Anchor[];
    for (const anchor of this.anchors) {
      if (anchor.annotation.$tag !== tag) {
        anchors.push(anchor);
      } else if (anchor.highlights) {
        removeHighlights(anchor.highlights);
      }
    }
    this._updateAnchors(anchors, notify);
  }

  _updateAnchors(anchors: Anchor[], notify: boolean) {
    this.anchors = anchors;
    this._clusterToolbar?.scheduleClusterUpdates();
    if (notify) {
      this._bucketBarClient.update(this.anchors);
    }
  }

  /**
   * Create a new annotation that is associated with the selected region of
   * the current document.
   *
   * @param options
   *   @param [options.highlight] - If true, the new annotation has
   *     the `$highlight` flag set, causing it to be saved immediately without
   *     prompting for a comment.
   * @return The new annotation
   */
  async createAnnotation({ highlight = false } = {}): Promise<AnnotationData> {
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

    const annotation: AnnotationData = {
      uri: info.uri,
      document: info.metadata,
      target,
      $highlight: highlight,
      $cluster: highlight ? 'user-highlights' : 'user-annotations',
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
   */
  _hoverAnnotations(tags: string[]) {
    this._hoveredAnnotations.clear();
    tags.forEach(tag => this._hoveredAnnotations.add(tag));

    for (const anchor of this.anchors) {
      if (anchor.highlights) {
        const toggle = tags.includes(anchor.annotation.$tag);
        setHighlightsFocused(anchor.highlights, toggle);
      }
    }

    this._sidebarRPC.call('hoverAnnotations', tags);
  }

  /**
   * Show or hide the adder toolbar when the selection changes.
   */
  _onSelection(range: Range) {
    const annotatableRange = this._integration.getAnnotatableRange(range);
    if (!annotatableRange) {
      this._onClearSelection();
      return;
    }

    const selection = document.getSelection()!;
    const isBackwards = isSelectionBackwards(selection);
    const focusRect = selectionFocusRect(selection);
    if (!focusRect) {
      // The selected range does not contain any text
      this._onClearSelection();
      return;
    }

    this.selectedRanges = [annotatableRange];
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
   * and opens the sidebar. Optionally it can also transfer keyboard focus to
   * the annotation card for the first selected annotation.
   *
   * @param tags
   * @param options
   *   @param [options.toggle] - Toggle whether the annotations are
   *     selected, as opposed to just selecting them
   *   @param [options.focusInSidebar] - Whether to transfer keyboard
   *     focus to the card for the first annotation in the selection. This
   *     option has no effect if {@link toggle} is true.
   */
  selectAnnotations(
    tags: string[],
    { toggle = false, focusInSidebar = false } = {}
  ) {
    if (toggle) {
      this._sidebarRPC.call('toggleAnnotationSelection', tags);
    } else {
      this._sidebarRPC.call('showAnnotations', tags, focusInSidebar);
    }
    this._sidebarRPC.call('openSidebar');
  }

  /**
   * Set whether highlights are visible in the document or not.
   *
   * @param visible
   * @param notifyHost - Whether to notify the host frame about this
   *   change. This should be true unless the request to change highlight
   *   visibility is coming from the host frame.
   */
  setHighlightsVisible(visible: boolean, notifyHost = true) {
    setHighlightsVisible(this.element, visible);
    this._highlightsVisible = visible;
    if (notifyHost) {
      this._hostRPC.call('highlightsVisibleChanged', visible);
    }
  }

  get highlightsVisible() {
    return this._highlightsVisible;
  }

  /**
   * Attempt to fit the document content alongside the sidebar.
   *
   * @param sidebarLayout
   */
  fitSideBySide(sidebarLayout: SidebarLayout) {
    this._sideBySideActive = this._integration.fitSideBySide(sidebarLayout);
    this.element.classList.toggle(
      'hypothesis-sidebyside-active',
      this._sideBySideActive
    );
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
   * Return the tags of annotations that are currently displayed in a hovered
   * state.
   */
  get hoveredAnnotationTags(): Set<string> {
    return this._hoveredAnnotations;
  }

  /**
   * Handle a potential shortcut trigger.
   */
  _handleShortcut(event: KeyboardEvent) {
    if (matchShortcut(event, 'Ctrl+Shift+H')) {
      this.setHighlightsVisible(!this._highlightsVisible);
    }
  }
}
