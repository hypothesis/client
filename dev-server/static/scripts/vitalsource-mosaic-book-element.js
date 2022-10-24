/**
 * Mock implementation of the `<mosaic-book>` custom element in the
 * VitalSource Bookshelf reader.
 *
 * This element is created in the book's container frame, and the element holds
 * the book's current content frame within its Shadow DOM.
 */
export class MosaicBookElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const chapterURLs = [
      '/document/little-women-1',
      '/document/little-women-2',
      '/document/little-women-3',
    ];

    let chapterIndex = 0;

    const setChapter = (index, { initialLoad = false } = {}) => {
      if (index < 0 || index >= chapterURLs.length) {
        return;
      }
      chapterIndex = index;

      // We remove the current frame and create a new one, rather than just
      // change the `src` of the existing iframe, to mimic what Bookshelf
      // does. The client should be robust to either approach.
      this.contentFrame?.remove();
      this.contentFrame = document.createElement('iframe');
      this.shadowRoot.append(this.contentFrame);

      const chapterURL = chapterURLs[chapterIndex];

      if (initialLoad) {
        // Simulate client loading after VS chapter content has already
        // loaded.
        this.contentFrame.src = chapterURL;
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
        this.contentFrame.src = 'about:blank';
        setTimeout(() => {
          // Set the final URL in a way that doesn't update the `src` attribute
          // of the iframe, to make sure the client isn't relying on that.
          this.contentFrame.contentWindow.location.href = chapterURL;
        }, 50);
      }
    };

    const styles = document.createElement('style');
    styles.innerHTML = `
      iframe {
        width: 100%;
        height: 400px;
        resize: both;
        overflow: auto;
      }
    `;
    this.shadowRoot.append(styles);

    const controlBar = document.createElement('div');
    this.shadowRoot.append(controlBar);

    this.prevButton = document.createElement('button');
    this.prevButton.textContent = 'Prev chapter';
    this.prevButton.onclick = () => setChapter(chapterIndex - 1);
    controlBar.append(this.prevButton);

    this.nextButton = document.createElement('button');
    this.nextButton.textContent = 'Next chapter';
    this.nextButton.onclick = () => setChapter(chapterIndex + 1);
    controlBar.append(this.nextButton);

    setChapter(0, { initialLoad: true });
  }
}
