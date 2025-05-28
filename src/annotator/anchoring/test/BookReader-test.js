import * as brAnchoring from '../BookReader';

/**
 * Return a DOM Range which refers to the specified `text` in `container`.
 *
 * @param {Element} container
 * @param {string} text
 * @return {Range}
 */
function findText(container, text) {
  // This is a very lazy implementation ; assumes no duplicate words ;
  // but it's sufficient for the tests.
  const textWords = text.split(/\s+/);
  const wordElements = Array.from(container.querySelectorAll('.BRwordElement'));
  const startNodeIndex = wordElements.findIndex(node => {
    return node.textContent === textWords[0];
  });
  const endNodeIndex =
    wordElements.slice(startNodeIndex).findIndex(node => {
      return node.textContent === textWords[textWords.length - 1];
    }) + startNodeIndex;
  const startNode = wordElements[startNodeIndex].firstChild;
  const endNode = wordElements[endNodeIndex].firstChild;

  if (!startNode || !endNode) {
    throw new Error(`Text "${text}" not found in container`);
  }
  const range = new Range();
  range.setStart(startNode, 0);
  range.setEnd(endNode, textWords[textWords.length - 1].length);
  return range;
}

const FAKE_TEXT_DATA = [
  `
    Flatland, a romance of many dimensions

    By A. Square, an Inhabitant of Flatland
  `,
  `
    I call our world Flatland, not because we call it so, but
    to make its nature clearer to you, my happy readers, who are
    privileged to live in Space.

    Imagine a vast sheet of paper on which straight Lines, Triangles,
    Squares, Pentagons, Hexagons, Heptagons, Octagons, and other
    Figures, instead of remaining fixed in their places, move freely
    about...
  `,
];

/**
 * @param {string[]} texts
 * @return {HTMLDivElement}
 */
function buildBookReaderDOM(texts) {
  const container = document.createElement('div');
  container.className = 'BookReader';
  for (const [i, text] of texts.entries()) {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'BRpagecontainer';
    pageContainer.setAttribute('data-index', (i + 1).toString());
    // Arbitrary offset to denote the page label
    pageContainer.setAttribute('data-page-num', (i + 10).toString());
    container.appendChild(pageContainer);

    const textLayer = document.createElement('div');
    textLayer.className = 'BRtextLayer';
    pageContainer.appendChild(textLayer);

    for (const paragraphText of text.trim().split('\n\n')) {
      const paragraphElement = document.createElement('p');
      paragraphElement.className = 'BRparagraphElement';
      textLayer.appendChild(paragraphElement);

      for (const line of paragraphText.trim().split('\n')) {
        const lineElement = document.createElement('span');
        paragraphElement.appendChild(lineElement);

        lineElement.innerHTML = line
          .trim()
          .split(' ')
          .map(word => `<span class="BRwordElement">${word}</span>`)
          .join(`<span class="BRspace"> </span>`);
        // Add a space at the end of the line to match the text layer
        paragraphElement.append(' ');
      }
    }
  }
  return container;
}

describe('annotator/anchoring/BookReader', () => {
  /** @type {HTMLDivElement} */
  let brRoot;

  beforeEach(() => {
    brRoot = buildBookReaderDOM(FAKE_TEXT_DATA);
  });

  afterEach(() => {
    brRoot.remove();
  });

  describe('describe', () => {
    it('returns quote and page selectors', async () => {
      const range = findText(brRoot, 'live in Space.');
      const selectors = await brAnchoring.describe(brRoot, range);
      selectors.sort((a, b) => a.type.localeCompare(b.type));

      const types = selectors.map(s => s.type);
      assert.deepEqual(types, ['PageSelector', 'TextQuoteSelector']);
    });

    it('returns a quote selector with the correct quote', async () => {
      const range = findText(brRoot, 'live in Space.');
      const selectors = await brAnchoring.describe(brRoot, range);
      const quote = selectors.find(s => s.type === 'TextQuoteSelector');

      assert.deepEqual(quote, {
        type: 'TextQuoteSelector',
        exact: 'live in Space.',
        prefix: ' readers, who are privileged to ',
        suffix: ' Imagine a vast sheet of paper o',
      });
    });

    it('returns a page selector with the page index and label', async () => {
      const range = findText(brRoot, 'live in Space.');
      const selectors = await brAnchoring.describe(brRoot, range);

      const page = selectors.find(s => s.type === 'PageSelector');
      assert.deepEqual(page, {
        type: 'PageSelector',
        index: 2,
        label: '11',
      });
    });

    it('throws if range spans multiple pages', async () => {
      const range = findText(brRoot, 'Inhabitant ... world');

      await assert.rejects(
        brAnchoring.describe(brRoot, range),
        'Selecting across page breaks is not supported',
      );
    });

    it('throws if range is outside the text layer', async () => {
      const range = new Range();
      const el = document.createElement('div');
      el.append('foobar');
      range.setStart(el.firstChild, 0);
      range.setEnd(el.firstChild, 6);

      await assert.rejects(
        brAnchoring.describe(brRoot, range),
        'Selection is outside page text',
      );
    });

    it('throws if range does not contain any text nodes', async () => {
      const range = new Range();
      const el = document.createElement('div');
      range.setStart(el, 0);
      range.setEnd(el, 0);

      await assert.rejects(
        brAnchoring.describe(brRoot, range),
        'Selection does not contain text',
      );
    });
  });

  describe('canDescribe', () => {
    it('returns true if range is in text layer', () => {
      const range = findText(brRoot, 'live in Space.');
      assert.isTrue(brAnchoring.canDescribe(range));
    });
  });

  describe('anchor', () => {
    it('anchors previously created selectors if the page is rendered', async () => {
      const range = findText(brRoot, 'live in Space.');
      const selectors = await brAnchoring.describe(brRoot, range);
      const anchoredRange = await brAnchoring.anchor(brRoot, selectors);
      assert.equal(anchoredRange.toString(), range.toString());
    });

    [[], [{ type: 'PageSelector', index: 2 }]].forEach(selectors => {
      it('fails to anchor if there is no quote selector', async () => {
        await assert.rejects(
          brAnchoring.anchor(brRoot, selectors),
          'No quote selector found',
        );
      });
    });

    [
      {
        // If there is only a prefix, that should match.
        test: 'prefix-only',
        prefix: 'Squares, Pent',
        suffix: undefined,
        expectedMatch: 'Pentagons,',
      },
      {
        // If there is only a suffix, that should match.
        test: 'suffix-only',
        prefix: undefined,
        suffix: 's, Heptagons, and',
        expectedMatch: 'Hexagons,',
      },
      {
        // If there is both a prefix and suffix, either can match
        test: 'prefix-match',
        prefix: 'tagons, Hexagons, ',
        suffix: 'DOES NOT MATCH',
        expectedMatch: 'Heptagons,',
      },
      {
        // If there is both a prefix and suffix, either can match
        test: 'suffix-match',
        prefix: 'DOES NOT MATCH',
        suffix: ', and other Fig',
        expectedMatch: 'Octagons,',
      },
      {
        // If there is neither a prefix or suffix, only the quote matters.
        test: 'no-context',
        prefix: undefined,
        suffix: undefined,
        expectedMatch: 'Pentagons,',
      },
    ].forEach(({ test, prefix, suffix, expectedMatch }) => {
      it(`prefers a context match for quote selectors (${test})`, async () => {
        const selectors = [
          {
            type: 'TextQuoteSelector',
            // Quote that occurs multiple times on the same page.
            exact: 'agon',
            prefix,
            suffix,
          },
          {
            type: 'PageSelector',
            index: 2,
          },
        ];

        const range = await brAnchoring.anchor(brRoot, selectors);

        assert.equal(range.toString(), 'agon');
        // Check that we found the correct occurrence of the quote.
        assert.equal(
          range.startContainer.parentElement.textContent,
          expectedMatch,
        );
      });
    });

    it('rejects if quote cannot be anchored', async () => {
      const selectors = [
        {
          type: 'TextQuoteSelector',
          exact: 'phrase that does not exist on the page',
        },
        {
          type: 'PageSelector',
          index: 2,
        },
      ];
      await assert.rejects(brAnchoring.anchor(brRoot, selectors), 'Quote not found');
    });
  });
});
