import {
  guessMainContentArea,
  preserveScrollPosition,
} from '../html-side-by-side';

describe('annotator/integrations/html-side-by-side', () => {
  let contentElements;

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

    document.body.append(root);
    contentElements.push(root);

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
