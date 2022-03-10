import {
  guessMainContentArea,
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

    it('selects content as a scroll anchor and preserves its position in the viewport', () => {
      scrollRoot.scrollTop = 200;
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(() => {
        // Make the viewport narrower. This will make the content taller and
        // require `preserveScrollPosition` to adjust the scroll offset to keep
        // the anchored content visible.
        scrollRoot.style.width = '150px';
      }, scrollRoot);

      assert.notEqual(delta, 0);

      // nb. `scrollTop` returns an integer number of pixels, whereas `delta`
      // may be fractional.
      assert.equal(
        Math.floor(scrollRoot.scrollTop),
        Math.floor(initialScrollTop + delta)
      );
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
      const delta = preserveScrollPosition(() => {
        scrollRoot.style.width = '150px';
      }, scrollRoot);

      // The scroll position should be adjusted. This would be zero if the
      // text in the <nav> element was used as a scroll anchor.
      assert.notEqual(delta, 0);
    });

    it('does not restore the scroll position if no anchor content could be found', () => {
      // Fill content with empty text, which cannot be used as a scroll anchor.
      content.textContent = ' '.repeat(documentText.length);
      scrollRoot.scrollTop = 200;
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(() => {
        // Make the viewport narrower. This will make the content taller and
        // require `preserveScrollPosition` to adjust the scroll offset to keep
        // the anchored content visible.
        scrollRoot.style.width = '150px';
      }, scrollRoot);

      assert.equal(delta, 0);
      assert.equal(scrollRoot.scrollTop, initialScrollTop);
    });

    it('does nothing if scroll element is outside viewport', () => {
      scrollRoot.style.position = 'absolute';
      scrollRoot.style.top = '10000px';

      scrollRoot.scrollTop = 200;
      const initialScrollTop = scrollRoot.scrollTop;

      const delta = preserveScrollPosition(() => {
        // Make the viewport narrower. This will make the content taller and
        // require `preserveScrollPosition` to adjust the scroll offset to keep
        // the anchored content visible.
        scrollRoot.style.width = '150px';
      }, scrollRoot);

      assert.equal(delta, 0);
      assert.equal(scrollRoot.scrollTop, initialScrollTop);
    });
  });
});
