import {
  guessMainContentArea,
  isSideBySideMode,
  preserveScrollPosition,
} from '../html-side-by-side';

describe('annotator/integrations/html-side-by-side', () => {
  let contentElements;

  function addContentElementToDocument(element) {
    contentElements.push(element);
    document.body.append(element);
  }

  function createContent(paragraphs) {
    const paraElements = paragraphs.map(({ content, left, width }) => {
      const el = document.createElement('p');
      el.textContent = content;
      el.style.position = 'absolute';
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      return el;
    });

    const root = document.createElement('div');
    root.append(...paraElements);
    addContentElementToDocument(root);

    return root;
  }

  beforeEach(() => {
    contentElements = [];
  });

  afterEach(() => {
    contentElements.forEach(ce => ce.remove());
  });

  describe('guessMainContentArea', () => {
    it('returns `null` if the document has no paragraphs', () => {
      const content = createContent([]);
      assert.isNull(guessMainContentArea(content));
    });

    it('returns the margins of the paragraphs with the most text', () => {
      const paragraphs = [];
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          paragraphs.push({
            content: `Long paragraph ${i + 1}`,
            left: 10,
            width: 100,
          });
        } else {
          paragraphs.push({
            content: `Paragraph ${i + 1}`,
            left: 20,
            width: 200,
          });
        }
      }

      const content = createContent(paragraphs);
      const area = guessMainContentArea(content);

      assert.deepEqual(area, { left: 10, right: 110 });
    });

    [
      '<p>content</p>',

      // Paragraphs in VitalSource "Great Book" format ebooks.
      '<div class="para">content</div>',
    ].forEach(contentHTML => {
      it('finds content area with various paragraph types', () => {
        const content = document.createElement('div');
        content.innerHTML = contentHTML;
        addContentElementToDocument(content);

        const area = guessMainContentArea(content);

        assert.ok(area);
      });
    });

    it('ignores the positions of hidden paragraphs', () => {
      const paragraphs = [];
      for (let i = 0; i < 10; i++) {
        paragraphs.push({
          content: `Hidden paragraph ${i + 1}`,
          left: 20,
          width: 200,
        });
      }
      for (let i = 0; i < 10; i++) {
        paragraphs.push({
          content: `Paragraph ${i + 1}`,
          left: 10,
          width: 100,
        });
      }

      const content = createContent(paragraphs);
      content.querySelectorAll('p').forEach(para => {
        if (para.textContent.startsWith('Hidden')) {
          para.style.display = 'none';
        }
      });

      const area = guessMainContentArea(content);

      assert.deepEqual(area, { left: 10, right: 110 });
    });
  });

  describe('preserveScrollPosition', () => {
    const documentText = `The four young faces on which the firelight shone
brightened at the cheerful words, but darkened again as Jo said sadly, "We
haven't got Father, and shall not have him for a long time." She didn't say
"perhaps never," but each silently added it, thinking of Father far away, where
the fighting was.`;

    let scrollRoot;
    let content;

    beforeEach(() => {
      // Create a small "viewport" which can only display part of the document
      // text at a time.
      scrollRoot = document.createElement('div');
      scrollRoot.style.fontSize = '16px';
      scrollRoot.style.width = '200px';
      scrollRoot.style.height = '50px';
      scrollRoot.style.overflow = 'scroll';
      document.body.append(scrollRoot);

      content = document.createElement('p');
      content.textContent = documentText;
      scrollRoot.append(content);
    });

    afterEach(() => {
      scrollRoot.remove();
    });

    function resizeViewportAndExpectScrollAdjustment() {
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(
        () => {
          // Make the viewport narrower. This will make the content taller and
          // require `preserveScrollPosition` to adjust the scroll offset to keep
          // the anchored content visible.
          scrollRoot.style.width = '150px';
        },
        scrollRoot,
        scrollRoot.getBoundingClientRect(),
      );

      assert.notEqual(delta, 0);

      // nb. `scrollTop` returns an integer number of pixels, whereas `delta`
      // may be fractional.
      assert.equal(
        Math.floor(scrollRoot.scrollTop),
        Math.floor(initialScrollTop + delta),
      );
    }

    it('selects content as a scroll anchor and preserves its position in the viewport', () => {
      scrollRoot.scrollTop = 200;
      resizeViewportAndExpectScrollAdjustment();
    });

    it('selects scroll anchor if it is part of overflowing content', () => {
      // Give the content a small height so that the text in the viewport is
      // part of overflowing content.
      content.style.height = '10px';
      scrollRoot.scrollTop = 200;
      resizeViewportAndExpectScrollAdjustment();
    });

    it('ignores fixed-position content when choosing a scroll anchor', () => {
      // Set up a DOM structure that emulates a page with a sticky heading:
      //
      // <div> // Scroll root
      //   <div> // Inner container
      //     <nav> // Fixed-position navbar
      //     <p>..</p> // Content
      //   </div>
      // </div>
      //
      // Here the `<nav>` contains the top-left most text node in the viewport,
      // but we should it because of its fixed position.
      //
      // The inner container is used to check that the element filtering is
      // applied as the DOM tree is recursively traversed.
      const nav = document.createElement('nav');
      nav.style.position = 'fixed';
      nav.style.left = '0px';
      nav.style.top = '0px';
      nav.textContent = 'Some heading';
      const inner = document.createElement('div');
      inner.append(nav, content);
      scrollRoot.append(inner);

      scrollRoot.scrollTop = 200;

      // Resize viewport and check scroll position is adjusted. It would not be
      // adjusted if the text in the <nav> element was used as a scroll anchor.
      resizeViewportAndExpectScrollAdjustment();
    });

    it('does not restore the scroll position if no anchor content could be found', () => {
      // Fill content with empty text, which cannot be used as a scroll anchor.
      content.textContent = ' '.repeat(documentText.length);
      scrollRoot.scrollTop = 200;
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(
        () => {
          // Make the viewport narrower. This will make the content taller and
          // require `preserveScrollPosition` to adjust the scroll offset to keep
          // the anchored content visible.
          scrollRoot.style.width = '150px';
        },
        scrollRoot,
        scrollRoot.getBoundingClientRect(),
      );

      assert.equal(delta, 0);
      assert.equal(scrollRoot.scrollTop, initialScrollTop);
    });

    it('does nothing if scroll root is outside viewport', () => {
      scrollRoot.style.position = 'absolute';
      scrollRoot.style.top = '10000px';

      scrollRoot.scrollTop = 200;
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(
        () => {
          // Make the viewport narrower. This will make the content taller and
          // require `preserveScrollPosition` to adjust the scroll offset to keep
          // the anchored content visible.
          scrollRoot.style.width = '150px';
        },
        scrollRoot,
        // Viewport
        new DOMRect(0, 0, 800, 600),
      );

      assert.equal(delta, 0);
      assert.equal(scrollRoot.scrollTop, initialScrollTop);
    });
  });

  describe('isSideBySideMode', () => {
    [
      { mode: 'auto', expectedResult: true },
      { mode: 'manual', expectedResult: true },
      { mode: 'invalid', expectedResult: false },
      { mode: 123, expectedResult: false },
      { mode: {}, expectedResult: false },
      { mode: false, expectedResult: false },
    ].forEach(({ mode, expectedResult }) => {
      it('returns expected result for different modes', () => {
        assert.equal(expectedResult, isSideBySideMode(mode));
      });
    });
  });
});
