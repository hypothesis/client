/**
 * Fake implementation of the parts of PDF.js that the Hypothesis client's
 * anchoring interacts with.
 *
 * This is used to create PDF anchoring tests which can execute quickly and be
 * easier to debug than the full PDF.js viewer application.
 *
 * The general structure is to have `Fake{OriginalClassName}` classes for
 * each of the relevant classes in PDF.js. The APIs of the fakes should conform
 * to the corresponding interfaces defined in `src/types/pdfjs.js`.
 */
import { EventEmitter } from '../../../shared/event-emitter';
import type {
  GetViewportParameters,
  RenderParameters,
  RenderTask,
  PDFPageProxy,
  PDFPageView,
  PageViewportParameters,
  PageViewport,
  PDFViewer,
  ViewBox,
} from '../../../types/pdfjs';
import { RenderingStates } from '../pdf';

/**
 * Options that control global aspects of the PDF.js fake, such as which
 * version of PDF.js is being emulated.
 */
export type PDFJSConfig = {
  /** Emulate PDF.js text rendering changes added in v2.9.359. */
  newTextRendering: boolean;

  /** The [x0, y0, x1, y1] coordinates of the crop box for PDF pages. */
  pageBoundingBox?: [number, number, number, number];
};

/**
 * Create the DOM structure for a page which matches the structure produced by
 * PDF.js
 *
 * @param content - The text content for the page
 * @param rendered - True if the page should be "rendered" or false if
 *        it should be an empty placeholder for a not-yet-rendered page
 * @return Root Element for the page
 */
function createPage(
  index: number,
  content: string,
  rendered: boolean,
  config: PDFJSConfig,
): HTMLElement {
  const pageEl = document.createElement('div');
  pageEl.classList.add('page');
  pageEl.setAttribute('data-page-number', (index + 1).toString());

  if (!rendered) {
    return pageEl;
  }

  const textLayer = document.createElement('div');
  textLayer.classList.add('textLayer');

  content.split(/\n/).forEach(item => {
    if (!config.newTextRendering && /^\s*$/.test(item)) {
      // PDF.js releases before v2.9.359 do not create elements in the text
      // layer for whitespace-only text items.
      return;
    }
    const itemEl = document.createElement('div');
    itemEl.textContent = item;
    textLayer.appendChild(itemEl);
  });

  pageEl.appendChild(textLayer);
  return pageEl;
}

/**
 * Fake implementation of `PDFPageProxy` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/src/display/api.js
 */
class FakePDFPageProxy implements PDFPageProxy {
  pageText: string;

  private _config: PDFJSConfig;
  private _view: [number, number, number, number];

  constructor(pageText: string, config: PDFJSConfig) {
    this.pageText = pageText;
    this._config = config;
    this._view = config.pageBoundingBox ?? [0, 0, 100, 200]; // [left, bottom, right, top]
  }

  get view() {
    return this._view;
  }

  getTextContent(params: { normalizeWhitespace?: boolean } = {}) {
    if (!params.normalizeWhitespace) {
      return Promise.reject(
        new Error('Expected `normalizeWhitespace` to be true'),
      );
    }

    const makeTextItem = (str: string) => {
      if (this._config.newTextRendering) {
        // The `hasEOL` property was added in https://github.com/mozilla/pdf.js/pull/13257
        // and its existence is used to feature-detect whether whitespace-only
        // items need to be ignored in the `items` array.
        return { str, hasEOL: false };
      } else {
        return { str };
      }
    };

    const textContent = {
      // The way that the page text is split into items will depend on
      // the PDF and the version of PDF.js - individual text items might be
      // just symbols, words, phrases or whole lines.
      //
      // Here we split items by line which matches the typical output for a
      // born-digital PDF.
      items: this.pageText.split(/\n/).map(makeTextItem),
    };

    return Promise.resolve(textContent);
  }

  getViewport(options: GetViewportParameters): PageViewport {
    return new FakePageViewport({
      viewBox: this._view,
      ...options,
    });
  }

  /** Render the page and return a task for tracking progress. */
  render(options: RenderParameters) {
    return new FakeRenderTask(options);
  }
}

class FakePageViewport implements PageViewport {
  rotation: number;
  scale: number;
  userUnit: number;
  viewBox: ViewBox;

  private _pdfToViewportTransform: DOMMatrix;

  constructor({
    rotation = 0,
    scale = 1.0,
    userUnit = 1 / 72,
    viewBox = [0, 0, 0, 0],
  }: PageViewportParameters) {
    this.rotation = rotation;
    this.scale = scale;
    this.userUnit = userUnit;
    this.viewBox = viewBox;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [left, bottom, right, top] = viewBox;

    this._pdfToViewportTransform = new DOMMatrix();

    // Flip Y axis and shift. In PDF space the bottom left is (0, 0) and the
    // Y axis goes up. In viewport space the top left is (0, 0) and the Y axis
    // goes down.
    this._pdfToViewportTransform.translateSelf(left, top);
    this._pdfToViewportTransform.scaleSelf(1, -1);

    // nb. We don't currently apply the rotation or scale to the transform here,
    // so behavior is only correct if rotation=0 and scale=1.
  }

  convertToViewportPoint(x: number, y: number): [number, number] {
    const pdfPoint = this._pdfToViewportTransform
      .inverse()
      .transformPoint({ x, y });
    return [pdfPoint.x, pdfPoint.y];
  }

  convertToPdfPoint(x: number, y: number): [number, number] {
    const viewPoint = this._pdfToViewportTransform.transformPoint({ x, y });
    return [viewPoint.x, viewPoint.y];
  }

  /* istanbul ignore next */
  get width() {
    const [left, , right] = this.viewBox;
    return right - left;
  }

  /* istanbul ignore next */
  get height() {
    const [, bottom, , top] = this.viewBox;
    return top - bottom;
  }
}

class FakeRenderTask implements RenderTask {
  promise: Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: RenderParameters) {
    this.promise = Promise.resolve();
  }
}

export type FakePDFPageViewOptions = {
  /** Whether this page is "rendered", as if it were near the viewport. */
  rendered: boolean;
  config: PDFJSConfig;
};

/**
 * Fake implementation of PDF.js `PDFPageView` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js
 */
class FakePDFPageView implements PDFPageView {
  div: HTMLElement;
  textLayer: {
    textLayerDiv: HTMLElement;
    renderingDone: boolean;
  } | null;
  renderingState: number;
  pageLabel: string | null;
  pdfPage: FakePDFPageProxy;
  viewport: PageViewport;

  /**
   * @param index - Index of the page
   * @param text - Text of the page
   */
  constructor(
    index: number,
    text: string,
    { rendered, config }: FakePDFPageViewOptions,
  ) {
    const pageEl = createPage(index, text, rendered, config);
    const textLayerEl = pageEl.querySelector('.textLayer') as HTMLElement;

    this.div = pageEl;
    this.textLayer = textLayerEl
      ? { textLayerDiv: textLayerEl, renderingDone: true }
      : null;
    this.renderingState = textLayerEl
      ? RenderingStates.FINISHED
      : RenderingStates.INITIAL;
    this.pdfPage = new FakePDFPageProxy(text, config);
    this.pageLabel = null;
    this.viewport = this.pdfPage.getViewport({ scale: 1.0 });
  }

  dispose() {
    this.div.remove();
  }

  getPagePoint(x: number, y: number) {
    return this.viewport.convertToPdfPoint(x, y);
  }
}

/**
 * Fake implementation of PDF.js' `PDFViewer` class.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.js
 */
class FakePDFViewer implements PDFViewer {
  viewer: HTMLElement;
  eventBus: EventEmitter<any>;
  currentScaleValue: 'auto' | 'page-fit' | 'page-width';
  update: () => void;

  private _container: HTMLElement;
  private _config: PDFJSConfig;
  private _content: string[];
  private _pages: FakePDFPageView[];

  constructor({ config, container, content }: Options) {
    this._config = config;
    this._container = container;
    this._content = content;

    this._pages = [];

    this.viewer = this._container;

    this.eventBus = new EventEmitter();

    this.currentScaleValue = 'auto';

    this.update = globalThis.sinon.stub();
  }

  get pagesCount() {
    return this._content.length;
  }

  /**
   * Return the `FakePDFPageView` object representing a rendered page or a
   * placeholder for one.
   *
   * During PDF.js startup when the document is still being loaded, this may
   * return a nullish value even when the PDF page index is valid.
   */
  getPageView(index: number) {
    this._checkBounds(index);
    return this._pages[index];
  }

  /**
   * Set the index of the page which is currently visible in the viewport.
   *
   * Pages from `index` up to and including `lastRenderedPage` will be
   * "rendered" and have a text layer available. Other pages will be "un-rendered"
   * with no text layer available, but only a placeholder element for the whole
   * page.
   */
  setCurrentPage(index: number, lastRenderedPage = index) {
    this._checkBounds(index);

    const pages = this._content.map(
      (text, idx) =>
        new FakePDFPageView(idx, text, {
          rendered: idx >= index && idx <= lastRenderedPage,
          config: this._config,
        }),
    );

    this._container.innerHTML = '';
    this._pages = pages;
    this._pages.forEach(page => this._container.appendChild(page.div));
  }

  dispose() {
    this._pages.forEach(page => page.dispose());
  }

  /**
   * Dispatch an event to notify observers that some event has occurred
   * in the PDF viewer.
   */
  notify(eventName: string, { eventDispatch = 'eventBus' } = {}) {
    if (eventDispatch === 'eventBus') {
      this.eventBus.emit(eventName);
    } else if (eventDispatch === 'dom') {
      this._container.dispatchEvent(
        new CustomEvent(eventName, { bubbles: true }),
      );
    }
  }

  _checkBounds(index: number) {
    if (index < 0 || index >= this._content.length) {
      throw new Error('Invalid page index ' + index.toString());
    }
  }
}

export type Options = {
  /** Container into which fake PDF viewer should render. */
  container: HTMLElement;
  /** Text for each page. */
  content: string[];
  config: PDFJSConfig;
};

/**
 * A minimal fake implementation of PDF.js' PDFViewerApplication interface.
 *
 * This emulates the parts of PDF.js that are relevant to anchoring tests.
 *
 * The original is defined at https://github.com/mozilla/pdf.js/blob/master/web/app.js
 */
export class FakePDFViewerApplication {
  appConfig: {
    appContainer: HTMLElement;
  };
  pdfViewer: FakePDFViewer;

  constructor(options: Options) {
    if (!options.config) {
      options.config = { newTextRendering: true };
    }

    this.appConfig = {
      // The root element which contains all of the PDF.js UI. In the real PDF.js
      // viewer this is generally `document.body`.
      appContainer: document.createElement('div'),
    };
    this.pdfViewer = new FakePDFViewer(options);
  }

  /**
   * Remove any DOM elements, timers etc. created by the fake PDF viewer.
   */
  dispose() {
    this.pdfViewer.dispose();
  }
}
