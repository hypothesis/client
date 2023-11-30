/**
 * @typedef {import('../../../src/types/vitalsource').MosaicBookElement} IMosaicBookElement
 */

/**
 * Mock implementation of the `<mosaic-book>` custom element in the
 * VitalSource Bookshelf reader.
 *
 * This element is created in the book's container frame, and the element holds
 * the book's current content frame within its Shadow DOM.
 *
 * @implements {IMosaicBookElement}
 */
export class MosaicBookElement extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });

    /**
     * Currently selected "page".
     *
     * We use the term "page" for consistency with the VitalSource API for this
     * element (eg. `getCurrentPage`), but the unit depends on the book type.
     * For PDFs each page is actually a page. For EPUBs each "page" is a
     * separate "Content Document" from the EPUB.
     */
    this.pageIndex = 0;
    this.pageData = [];

    const styles = document.createElement('style');
    styles.innerHTML = `
      iframe {
        width: 100%;
        height: 500px;
        resize: both;
        overflow: auto;
      }
    `;
    shadowRoot.append(styles);

    const controlBar = document.createElement('div');
    shadowRoot.append(controlBar);

    this.prevButton = document.createElement('button');
    this.prevButton.textContent = 'Prev chapter';
    this.prevButton.onclick = () => this.setPage(this.pageIndex - 1);
    controlBar.append(this.prevButton);

    this.nextButton = document.createElement('button');
    this.nextButton.textContent = 'Next chapter';
    this.nextButton.onclick = () => this.setPage(this.pageIndex + 1);
    controlBar.append(this.nextButton);
  }

  connectedCallback() {
    const book = this.getAttribute('book');

    if (book === 'little-women') {
      this.pageData = [
        {
          absoluteURL: '/document/little-women-1',
          chapterTitle: 'Chapter One',
          cfi: '/2',
          index: undefined,
          page: '10',
        },
        {
          absoluteURL: '/document/little-women-2',
          chapterTitle: 'Chapter Two',
          cfi: '/4',
          index: undefined,
          page: '20',
        },
        {
          absoluteURL: '/document/little-women-3',
          chapterTitle: 'Chapter Three',
          cfi: '/6',
          index: undefined,
          page: '30',
        },
      ];
    } else if (book === 'test-pdf') {
      this.pageData = [
        {
          absoluteURL: '/document/vitalsource-pdf-page',
          chapterTitle: 'Test chapter',
          cfi: '/0',
          index: 0,
          page: '1',
        },
      ];
    } else {
      console.warn(`Unknown VitalSource book "${book}"`);
    }

    this.setPage(0, { initialLoad: true });
  }

  /**
   * Set the currently loaded chapter.
   *
   * NOTE: This is a custom API that is not present on the real `<mosaic-book>` element.
   */
  setPage(index, { initialLoad = false } = {}) {
    if (index < 0 || index >= this.pageData.length) {
      return;
    }
    this.pageIndex = index;

    // We remove the current frame and create a new one, rather than just
    // change the `src` of the existing iframe, to mimic what Bookshelf
    // does. The client should be robust to either approach.
    this.contentFrame?.remove();
    this.contentFrame = document.createElement('iframe');
    /** @type {ShadowRoot} */ (this.shadowRoot).append(this.contentFrame);

    const pageURL = this.pageData[this.pageIndex].absoluteURL;

    if (initialLoad) {
      // Simulate client loading after VS chapter content has already
      // loaded.
      this.contentFrame.src = pageURL;
    } else {
      // Simulate chapter navigation after client is injected. These
      // navigations happen in several stages:
      //
      // 1. The previous chapter's iframe is removed
      // 2. A new iframe is created. The initial HTML is a "blank" page
      //    containing (invisible) content data for the new chapter as
      //    text in the page.
      // 3. The content data is posted to the server via a form
      //    submission, which returns the decoded HTML.
      //
      // The client should only inject into the new frame after step 3.
      this.contentFrame.src = '/document/vitalsource-temp-page';
      setTimeout(() => {
        // Set the final URL in a way that doesn't update the `src` attribute
        // of the iframe, to make sure the client isn't relying on that.
        if (this.contentFrame?.contentWindow) {
          this.contentFrame.contentWindow.location.href = pageURL;
        }
      }, 50);
    }

    this.prevButton.disabled = index === 0;
    this.nextButton.disabled = index === this.pageData.length - 1;
  }

  getBookInfo() {
    const book = this.getAttribute('book');

    if (book === 'little-women') {
      return /** @type {const} */ ({
        format: 'epub',
        isbn: '9780451532084',
        title: 'Little Women',
      });
    } else if (book === 'test-pdf') {
      return /** @type {const} */ ({
        format: 'pbk',
        isbn: 'TEST-PDF',
        title: 'Test PDF',
      });
    } else {
      throw new Error('Unknown book ID');
    }
  }

  async getCurrentPage() {
    return this.pageData[this.pageIndex];
  }

  async getPages() {
    return { ok: true, data: [...this.pageData], status: 200 };
  }

  async getTOC() {
    // In our VS test pages, the TOC entries are 1:1 with the page entries.
    // However in a real VS book there may be multiple TOC entries for different
    // parts of a single page, and there is also an issue where the titles
    // may be different. See https://github.com/hypothesis/client/issues/4986.
    const tocEntries = this.pageData.map(page => ({
      cfi: page.cfi,
      level: 1,
      title: page.chapterTitle,
      path: page.absoluteURL,
      page: page.page,
    }));
    return { ok: true, data: tocEntries, status: 200 };
  }

  goToCfi(cfi) {
    for (let [i, page] of this.pageData.entries()) {
      if (page.cfi === cfi) {
        this.setPage(i);
        return;
      }
    }
    throw new Error(`No page found with CFI "${cfi}"`);
  }

  goToURL(url) {
    for (let [i, page] of this.pageData.entries()) {
      if (page.url === url) {
        this.setPage(i);
        return;
      }
    }
    throw new Error(`No page found with URL "${url}"`);
  }
}
