import { guessMainContentArea } from '../html-side-by-side';

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
});
