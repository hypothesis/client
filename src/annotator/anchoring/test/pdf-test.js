'use strict';

const domAnchorTextQuote = require('dom-anchor-text-quote');

const FakePDFViewerApplication = require('./fake-pdf-viewer-application');
const pdfAnchoring = require('../pdf');

/**
 * Return a DOM Range which refers to the specified `text` in `container`.
 *
 * @param {Element} container
 * @param {string} text
 * @return {Range}
 */
function findText(container, text) {
  return domAnchorTextQuote.toRange(container, { exact: text });
}

const fixtures = {
  // Each item in this list contains the text for one page of the "PDF"
  pdfPages: [
    'Pride And Prejudice And Zombies\n' +
      'By Jane Austin and Seth Grahame-Smith ',

    'IT IS A TRUTH universally acknowledged that a zombie in possession of\n' +
      'brains must be in want of more brains. Never was this truth more plain\n' +
      'than during the recent attacks at Netherfield Park, in which a household\n' +
      'of eighteen was slaughtered and consumed by a horde of the living dead.',

    '"My dear Mr. Bennet," said his lady to him one day, "have you heard that\n' +
      'Netherfield Park is occupied again?" ',

    'NODE A\nNODE B\nNODE C',
  ],
};

describe('annotator.anchoring.pdf', function() {
  let container;
  let viewer;

  beforeEach(function() {
    // The rendered text for each page is cached during anchoring.
    // Clear this here so that each test starts from the same state.
    pdfAnchoring.purgeCache();

    container = document.createElement('div');
    document.body.appendChild(container);

    window.PDFViewerApplication = viewer = new FakePDFViewerApplication({
      container: container,
      content: fixtures.pdfPages,
    });
    viewer.pdfViewer.setCurrentPage(0);
  });

  afterEach(function() {
    window.PDFViewerApplication.dispose();
    window.PDFViewerApplication = null;
    container.remove();
  });

  describe('#describe', function() {
    it('returns position and quote selectors', function() {
      viewer.pdfViewer.setCurrentPage(2);
      const range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function(selectors) {
        const types = selectors.map(function(s) {
          return s.type;
        });
        assert.deepEqual(types, ['TextPositionSelector', 'TextQuoteSelector']);
      });
    });

    it('returns a position selector with correct start/end offsets', function() {
      viewer.pdfViewer.setCurrentPage(2);
      const quote = 'Netherfield Park';
      const range = findText(container, quote);
      const contentStr = fixtures.pdfPages.join('');
      const expectedPos = contentStr.replace(/\n/g, '').lastIndexOf(quote);

      return pdfAnchoring.describe(container, range).then(function(selectors) {
        const position = selectors[0];
        assert.equal(position.start, expectedPos);
        assert.equal(position.end, expectedPos + quote.length);
      });
    });

    it('returns a quote selector with the correct quote', function() {
      viewer.pdfViewer.setCurrentPage(2);
      const range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function(selectors) {
        const quote = selectors[1];

        assert.deepEqual(quote, {
          type: 'TextQuoteSelector',
          exact: 'Netherfield Park',
          prefix: 'im one day, "have you heard that',
          suffix: ' is occupied again?" ',
        });
      });
    });

    it('returns selector when range starts at end of text node with no next siblings', function() {
      // this problem is referenced in client issue #122
      // But what is happening is the startContainer is referencing a text
      // elment inside of a node. The logic in pdf#describe() was assuming if the
      // selection was not middle of the word, the text node would have a nextSibling.
      // However, if the selection is at the end of the only text node of its
      // parent set, this fails.

      viewer.pdfViewer.setCurrentPage(3);

      const quote = 'NODE B';

      // this selects NODE A text node
      const textNodeSelected = container.querySelector('.textLayer div')
        .firstChild;
      const staticRange = findText(container, quote);

      const range = {
        // put the selection at the very end of the node
        startOffset: textNodeSelected.length,
        startContainer: textNodeSelected,
        endOffset: staticRange.endOffset,
        endContainer: staticRange.endContainer,
        commonAncestorContainer: staticRange.commonAncestorContainer,
      };

      const contentStr = fixtures.pdfPages.join('');
      const expectedPos = contentStr.replace(/\n/g, '').lastIndexOf(quote);

      return pdfAnchoring.describe(container, range).then(function(selectors) {
        const position = selectors[0];
        assert.equal(position.start, expectedPos);
        assert.equal(position.end, expectedPos + quote.length);
      });
    });

    it('rejects when text selection spans multiple pages', () => {
      viewer.pdfViewer.setCurrentPage(2, 3);
      const range = findText(container, 'occupied again? NODE A');

      return pdfAnchoring.describe(container, range).catch(err => {
        assert.equal(
          err.message,
          'selecting across page breaks is not supported'
        );
      });
    });
  });

  describe('#anchor', function() {
    it('anchors previously created selectors if the page is rendered', function() {
      viewer.pdfViewer.setCurrentPage(2);
      const range = findText(container, 'My dear Mr. Bennet');
      return pdfAnchoring.describe(container, range).then(function(selectors) {
        const position = selectors[0];
        const quote = selectors[1];

        // Test that all of the selectors anchor and that each selector individually
        // anchors correctly as well
        const subsets = [[position, quote], [position], [quote]];
        const subsetsAnchored = subsets.map(function(subset) {
          const types = subset.map(function(s) {
            return s.type;
          });
          const description = 'anchoring failed with ' + types.join(', ');

          return pdfAnchoring
            .anchor(container, subset)
            .then(function(anchoredRange) {
              assert.equal(
                anchoredRange.toString(),
                range.toString(),
                description
              );
            })
            .catch(function(err) {
              console.warn(description);
              throw err;
            });
        });
        return Promise.all(subsetsAnchored);
      });
    });

    [
      {
        // Position on same page as quote but different text.
        offset: 5,
      },
      {
        // Position on a different page to the quote.
        offset: fixtures.pdfPages[0].length + 10,
      },
      {
        // Position invalid for document.
        offset: 100000,
      },
    ].forEach(({ offset }) => {
      it('anchors using a quote if the position selector fails', function() {
        viewer.pdfViewer.setCurrentPage(0);
        const range = findText(container, 'Pride And Prejudice');
        return pdfAnchoring
          .describe(container, range)
          .then(function(selectors) {
            const position = selectors[0];
            const quote = selectors[1];

            position.start += offset;
            position.end += offset;

            return pdfAnchoring.anchor(container, [position, quote]);
          })
          .then(range => {
            assert.equal(range.toString(), 'Pride And Prejudice');
          });
      });
    });

    it('anchors to a placeholder element if the page is not rendered', function() {
      viewer.pdfViewer.setCurrentPage(2);
      const range = findText(container, 'Netherfield Park');
      return pdfAnchoring
        .describe(container, range)
        .then(function(selectors) {
          viewer.pdfViewer.setCurrentPage(0);
          return pdfAnchoring.anchor(container, selectors);
        })
        .then(function(anchoredRange) {
          assert.equal(anchoredRange.toString(), 'Loading annotations…');
        });
    });

    it('rejects if quote cannot be anchored', () => {
      viewer.pdfViewer.setCurrentPage(2);
      const selectors = [
        {
          type: 'TextQuoteSelector',
          exact: 'phrase that does not exist in the PDF',
        },
      ];
      return pdfAnchoring.anchor(container, selectors).catch(err => {
        assert.equal(err.message, 'Quote not found');
      });
    });

    it('re-anchors successfully using caches', () => {
      viewer.pdfViewer.setCurrentPage(2);
      const range = findText(container, 'said his lady');
      let selectors;
      return pdfAnchoring
        .describe(container, range)
        .then(selectors_ => {
          selectors = selectors_;

          // Adjust the position selector so that anchoring fails, and a fallback
          // to the quote selector is required.
          const position = selectors.find(
            s => s.type === 'TextPositionSelector'
          );
          position.start += 100;
          position.end += 100;

          return pdfAnchoring.anchor(container, selectors);
        })
        .then(() => {
          // Anchor again using the same selectors. This time anchoring will
          // use the existing cache.
          return pdfAnchoring.anchor(container, selectors);
        })
        .then(range => {
          assert.equal(range.toString(), 'said his lady');
        });
    });
  });
});
