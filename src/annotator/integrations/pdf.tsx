import { ListenerCollection } from '@hypothesis/frontend-shared';
import debounce from 'lodash.debounce';
import { TinyEmitter } from 'tiny-emitter';

import type {
  Anchor,
  AnnotationData,
  AnnotationTool,
  Annotator,
  ContentInfoConfig,
  Destroyable,
  FeatureFlags,
  Integration,
  SidebarLayout,
} from '../../types/annotator';
import type { Selector } from '../../types/api';
import type { PDFViewer, PDFViewerApplication } from '../../types/pdfjs';
import {
  RenderingStates,
  anchor,
  canDescribe,
  describe,
  documentHasText,
  isTextLayerRenderingDone,
} from '../anchoring/pdf';
import { isInPlaceholder, removePlaceholder } from '../anchoring/placeholder';
import { TextRange } from '../anchoring/text-range';
import Banners from '../components/Banners';
import ContentInfoBanner from '../components/ContentInfoBanner';
import WarningBanner from '../components/WarningBanner';
import { PreactContainer } from '../util/preact-container';
import { offsetRelativeTo, scrollElement } from '../util/scroll';
import { PDFMetadata } from './pdf-metadata';

/**
 * Window with additional globals set by PDF.js.
 */
type PDFWindow = Window & { PDFViewerApplication: PDFViewerApplication };

// The viewport and controls for PDF.js start breaking down below about 670px
// of available space, so only render PDF and sidebar side-by-side if there
// is enough room. Otherwise, allow sidebar to overlap PDF
const MIN_PDF_WIDTH = 680;

/**
 * Return true if `anchor` is in an un-rendered page.
 */
function anchorIsInPlaceholder(anchor: Anchor) {
  const highlight = anchor.highlights?.[0];
  return highlight && isInPlaceholder(highlight);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Is the current document the PDF.js viewer application?
 */
export function isPDF() {
  const maybePDFJS: Window & { PDFViewerApplication?: PDFViewerApplication } =
    window;
  return typeof maybePDFJS.PDFViewerApplication !== 'undefined';
}

/**
 * Controller for the `<hypothesis-banner>` UI element that contains various
 * notices related to the PDF (eg. warning if PDF has no selectable text,
 * showing info about where the PDF came from).
 *
 * This element is created lazily when there is content to show.
 */
class BannerController implements Destroyable {
  /** Top-level DOM element associated with the PDF.js viewer. */
  private _pdfjsContainer: HTMLElement;
  private _container: PreactContainer | null;
  private _contentInfo: ContentInfoConfig | null;

  /** Warning that the current PDF does not have selectable text. */
  private _noTextWarning: boolean;

  constructor() {
    this._pdfjsContainer = document.querySelector(
      '#outerContainer',
    ) as HTMLElement;

    this._contentInfo = null;
    this._noTextWarning = false;
    this._container = null;
  }

  /**
   * Show a banner with information about the provider of the PDF.
   *
   * This is a contractual requirement for some LMS content providers.
   */
  setContentInfo(info: ContentInfoConfig) {
    this._contentInfo = info;
    this._update();
  }

  /**
   * Set whether the "PDF has no selectable text" notice is shown.
   */
  showNoTextWarning(show: boolean) {
    this._noTextWarning = show;
    this._update();
  }

  destroy() {
    this._container?.destroy();
  }

  private _update() {
    const show = this._noTextWarning || this._contentInfo;
    if (!show) {
      this._container?.destroy();
      this._container = null;

      // Undo inline styles applied when the banner is shown. The banner will
      // then gets its normal 100% height set by PDF.js's CSS.
      this._pdfjsContainer.style.height = '';

      return;
    }

    if (!this._container) {
      this._container = new PreactContainer('banner', () => this._render());
      document.body.prepend(this._container.element);
    }

    this._container.render();

    // The `#outerContainer` element normally has height set to 100% of the body.
    //
    // Reduce this by the height of the banner so that it doesn't extend beyond
    // the bottom of the viewport.
    //
    // We don't currently handle the height of the banner changing here.
    const bannerHeight = this._container.element.getBoundingClientRect().height;
    this._pdfjsContainer.style.height = `calc(100% - ${bannerHeight}px)`;
  }

  private _render() {
    return (
      <Banners>
        {this._contentInfo && <ContentInfoBanner info={this._contentInfo} />}
        {this._noTextWarning && <WarningBanner />}
      </Banners>
    );
  }
}

export type Options = {
  annotator: Annotator;
  features: FeatureFlags;

  /** Max time to wait for re-anchoring to complete when scrolling to an un-rendered page. */
  reanchoringMaxWait?: number;
};

/**
 * Integration that works with PDF.js
 */
export class PDFIntegration extends TinyEmitter implements Integration {
  private _annotator: Annotator;

  /** Banners shown at the top of the PDF viewer. */
  private _banner: BannerController;

  /**
   * A flag that indicates whether `destroy` has been called. Used to handle
   * `destroy` being called during async code elsewhere in the class.
   */
  private _destroyed: boolean;
  private _features: FeatureFlags;
  private _listeners: ListenerCollection;
  private _observer: MutationObserver;
  private _pdfContainer: HTMLElement;
  private _pdfMetadata: PDFMetadata;
  private _pdfViewer: PDFViewer;

  /**
   * Amount of time to wait for re-anchoring to complete when scrolling to
   * an anchor in a not-yet-rendered page.
   */
  private _reanchoringMaxWait: number;
  private _updateAnnotationLayerVisibility: () => void;

  private _sideBySideActive: boolean;

  constructor({ annotator, features, reanchoringMaxWait }: Options) {
    super();

    this._annotator = annotator;

    // Assume this class is only used if we're in the PDF.js viewer.
    const pdfWindow = window as unknown as PDFWindow;
    const pdfViewerApp = pdfWindow.PDFViewerApplication;

    this._pdfViewer = pdfViewerApp.pdfViewer;
    this._pdfViewer.viewer.classList.add('has-transparent-text-layer');

    // Get the element that contains all of the PDF.js UI. This is typically
    // `document.body`.
    this._pdfContainer = pdfViewerApp.appConfig?.appContainer ?? document.body;

    this._pdfMetadata = new PDFMetadata(pdfViewerApp);

    this._observer = new MutationObserver(debounce(() => this._update(), 100));
    this._observer.observe(this._pdfViewer.viewer, {
      attributes: true,
      attributeFilter: ['data-loaded'],
      childList: true,
      subtree: true,
    });

    this._reanchoringMaxWait = reanchoringMaxWait ?? 3000;
    this._banner = new BannerController();
    this._checkForSelectableText();
    this._sideBySideActive = false;

    // Hide annotation layer when the user is making a selection. The annotation
    // layer appears above the invisible text layer and can interfere with text
    // selection. See https://github.com/hypothesis/client/issues/1464.
    this._updateAnnotationLayerVisibility = () => {
      const selection = pdfWindow.getSelection()!;

      // Add CSS class to indicate whether there is a selection. Annotation
      // layers are then hidden by a CSS rule in `pdfjs-overrides.scss`.
      this._pdfViewer.viewer.classList.toggle(
        'is-selecting',
        !selection.isCollapsed,
      );
    };

    this._listeners = new ListenerCollection();
    this._listeners.add(
      document,
      'selectionchange',
      this._updateAnnotationLayerVisibility,
    );

    this._destroyed = false;

    this._features = features;
    this._features.on('flagsChanged', () => {
      this.emit('supportedToolsChanged', this.supportedTools());
    });
  }

  destroy() {
    this.fitSideBySide({
      // Dummy layout that will cause side-by-side mode to be undone.
      expanded: false,
      width: 0,
      toolbarWidth: 0,
      height: window.innerHeight,
    });

    this._listeners.removeAll();
    this._pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    this._observer.disconnect();
    this._banner.destroy();
    this._destroyed = true;
  }

  /**
   * Return the URL of the currently loaded PDF document.
   */
  uri() {
    return this._pdfMetadata.getUri();
  }

  /**
   * Return the metadata (eg. title) for the currently loaded PDF document.
   */
  getMetadata() {
    return this._pdfMetadata.getMetadata();
  }

  /**
   * Display a banner at the top of the PDF viewer showing information about the
   * current document.
   */
  showContentInfo(info: ContentInfoConfig) {
    this._banner.setContentInfo(info);
  }

  /**
   * Resolve serialized `selectors` from an annotation to a range.
   */
  anchor(root: HTMLElement, selectors: Selector[]): Promise<Range> {
    // nb. The `root` argument is not really used by `anchor`. It existed for
    // consistency between HTML and PDF anchoring and could be removed.
    return anchor(root, selectors);
  }

  /**
   * Trim `range` to remove leading or trailing empty content, then check to see
   * if that trimmed Range lies within a single PDF page's text layer. If so,
   * return the trimmed Range.
   */
  getAnnotatableRange(range: Range) {
    try {
      const trimmedRange = TextRange.trimmedRange(range);
      if (canDescribe(trimmedRange)) {
        return trimmedRange;
      }
    } catch (err) {
      if (!(err instanceof RangeError)) {
        throw err;
      }
    }
    return null;
  }

  /* istanbul ignore next */
  canStyleClusteredHighlights() {
    return true;
  }

  /**
   * Generate selectors for the text in `range`.
   */
  describe(root: HTMLElement, range: Range): Promise<Selector[]> {
    // nb. The `root` argument is not really used by `anchor`. It existed for
    // consistency between HTML and PDF anchoring and could be removed.
    return describe(root, range);
  }

  /**
   * Check whether the PDF has selectable text and show a warning if not.
   */
  async _checkForSelectableText() {
    // Wait for PDF to load.
    try {
      await this.uri();
    } catch {
      return;
    }

    // Handle `PDF` instance being destroyed while URI is fetched. This is only
    // expected to happen in synchronous tests.
    if (this._destroyed) {
      return;
    }

    try {
      const hasText = await documentHasText();
      this._banner.showNoTextWarning(!hasText);
    } catch (err) {
      /* istanbul ignore next */
      console.warn('Unable to check for text in PDF:', err);
    }
  }

  // This method (re-)anchors annotations when pages are rendered and destroyed.
  _update() {
    // A list of annotations that need to be refreshed.
    const refreshAnnotations = [] as AnnotationData[];

    const pageCount = this._pdfViewer.pagesCount;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = this._pdfViewer.getPageView(pageIndex);
      if (!page?.textLayer || !isTextLayerRenderingDone(page.textLayer)) {
        continue;
      }

      // Detect what needs to be done by checking the rendering state.
      switch (page.renderingState) {
        case RenderingStates.INITIAL:
          // This page has been reset to its initial state so its text layer
          // is no longer valid. Null it out so that we don't process it again.
          page.textLayer = null;
          break;
        case RenderingStates.FINISHED:
          // This page is still rendered. If it has a placeholder node that
          // means the PDF anchoring module anchored annotations before it was
          // rendered. Remove this, which will cause the annotations to anchor
          // again, below.
          removePlaceholder(page.div);
          break;
      }
    }

    // Find all the anchors that have been invalidated by page state changes.
    for (const anchor of this._annotator.anchors) {
      // Skip any we already know about.
      if (anchor.highlights) {
        if (refreshAnnotations.includes(anchor.annotation)) {
          continue;
        }

        // If the highlights are no longer in the document it means that either
        // the page was destroyed by PDF.js or the placeholder was removed above.
        // The annotations for these anchors need to be refreshed.
        for (let index = 0; index < anchor.highlights.length; index++) {
          const hl = anchor.highlights[index];
          if (!document.body.contains(hl)) {
            anchor.highlights.splice(index, 1);
            delete anchor.range;
            refreshAnnotations.push(anchor.annotation);
            break;
          }
        }
      }
    }

    refreshAnnotations.map(annotation => this._annotator.anchor(annotation));
  }

  /**
   * Return the scrollable element which contains the document content.
   */
  contentContainer(): HTMLElement {
    return document.querySelector('#viewerContainer') as HTMLElement;
  }

  /**
   * Attempt to make the PDF viewer and the sidebar fit side-by-side without
   * overlap if there is enough room in the viewport to do so reasonably.
   * Resize the PDF viewer container element to leave the right amount of room
   * for the sidebar, and prompt PDF.js to re-render the PDF pages to scale
   * within that resized container.
   *
   * @return - True if side-by-side mode was activated
   */
  fitSideBySide(sidebarLayout: SidebarLayout): boolean {
    const maximumWidthToFit = window.innerWidth - sidebarLayout.width;
    const active = sidebarLayout.expanded && maximumWidthToFit >= MIN_PDF_WIDTH;

    // If the sidebar is closed, we reserve enough space for the toolbar controls
    // so that they don't overlap a) the chevron-menu on the right side of
    // PDF.js's top toolbar and b) the document's scrollbar.
    //
    // If the sidebar is open, we reserve space for the whole sidebar if there is
    // room, otherwise we reserve the same space as in the closed state to
    // prevent the PDF content shifting when opening and closing the sidebar.
    const reservedSpace = active
      ? sidebarLayout.width
      : sidebarLayout.toolbarWidth;
    this._pdfContainer.style.width = `calc(100% - ${reservedSpace}px)`;

    // The following logic is pulled from PDF.js `webViewerResize`
    const currentScaleValue = this._pdfViewer.currentScaleValue;
    if (
      currentScaleValue === 'auto' ||
      currentScaleValue === 'page-fit' ||
      currentScaleValue === 'page-width'
    ) {
      // NB: There is logic within the setter for `currentScaleValue`
      // Setting this scale value will prompt PDF.js to recalculate viewport
      this._pdfViewer.currentScaleValue = currentScaleValue;
    }
    // This will cause PDF pages to re-render if their scaling has changed
    this._pdfViewer.update();

    this._sideBySideActive = active;

    return active;
  }

  sideBySideActive() {
    return this._sideBySideActive;
  }

  supportedTools(): AnnotationTool[] {
    const imageAnnotation = this._features?.flagEnabled('pdf_image_annotation');
    if (imageAnnotation) {
      return ['selection', 'rect'];
    } else {
      return ['selection'];
    }
  }

  /**
   * Scroll to the location of an anchor in the PDF.
   *
   * If the anchor refers to a location that is an un-rendered page far from
   * the viewport, then scrolling happens in three phases. First the document
   * scrolls to the approximate location indicated by the placeholder anchor,
   * then `scrollToAnchor` waits until the page's text layer is rendered and
   * the annotation is re-anchored in the fully rendered page. Then it scrolls
   * again to the final location.
   */
  async scrollToAnchor(anchor: Anchor) {
    const annotation = anchor.annotation;
    const inPlaceholder = anchorIsInPlaceholder(anchor);
    const offset = this._anchorOffset(anchor);
    if (offset === null) {
      return;
    }

    // nb. We only compute the scroll offset once at the start of scrolling.
    // This is important as the highlight may be removed from the document during
    // the scroll due to a page transitioning from rendered <-> un-rendered.
    await scrollElement(this.contentContainer(), offset);

    if (inPlaceholder) {
      const anchor = await this._waitForAnnotationToBeAnchored(
        annotation,
        this._reanchoringMaxWait,
      );
      if (!anchor) {
        return;
      }
      const offset = this._anchorOffset(anchor);
      if (offset === null) {
        return;
      }
      await scrollElement(this.contentContainer(), offset);
    }
  }

  /**
   * Wait for an annotation to be anchored in a rendered page.
   */
  async _waitForAnnotationToBeAnchored(
    annotation: AnnotationData,
    maxWait: number,
  ): Promise<Anchor | null> {
    const start = Date.now();
    let anchor;
    do {
      // nb. Re-anchoring might result in a different anchor object for the
      // same annotation.
      anchor = this._annotator.anchors.find(a => a.annotation === annotation);
      if (!anchor || anchorIsInPlaceholder(anchor)) {
        anchor = null;

        // If no anchor was found, wait a bit longer and check again to see if
        // re-anchoring completed.
        await delay(20);
      }
    } while (!anchor && Date.now() - start < maxWait);
    return anchor ?? null;
  }

  /**
   * Return the offset that the PDF content container would need to be scrolled
   * to, in order to make an anchor visible.
   *
   * @return - Target offset or `null` if this anchor was not resolved
   */
  _anchorOffset(anchor: Anchor): number | null {
    if (!anchor.highlights) {
      // This anchor was not resolved to a location in the document.
      return null;
    }
    const highlight = anchor.highlights[0];
    return offsetRelativeTo(highlight, this.contentContainer());
  }
}
