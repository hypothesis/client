'use strict';

var domAnchorTextQuote = require('dom-anchor-text-quote');

var FakePDFViewerApplication = require('./fake-pdf-viewer-application');
var pdfAnchoring = require('../pdf');

/**
 * Return a DOM Range which refers to the specified `text` in `container`.
 *
 * @param {Element} container
 * @param {string} text
 * @return {Range}
 */
function findText(container, text) {
  return domAnchorTextQuote.toRange(container, {exact: text});
}

var fixtures = {
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

describe('annotator.anchoring.pdf', function () {
  var container;
  var viewer;

  beforeEach(function () {
    // The rendered text for each page is cached during anchoring.
    // Clear this here so that each test starts from the same state.
    pdfAnchoring.purgeCache();

    container = document.createElement('div');
    document.body.appendChild(container);

    window.PDFViewerApplication = viewer = new FakePDFViewerApplication({
      container: container,
      content: fixtures.pdfPages,
    });
    viewer.setCurrentPage(0);
  });

  afterEach(function () {
    window.PDFViewerApplication.dispose();
    window.PDFViewerApplication = null;
    container.remove();
  });

  describe('#describe', function () {
    it('returns position and quote selectors', function () {
      viewer.setCurrentPage(2);
      var range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var types = selectors.map(function (s) { return s.type; });
        assert.deepEqual(types, ['TextPositionSelector', 'TextQuoteSelector']);
      });
    });

    it('returns a position selector with correct start/end offsets', function () {
      viewer.setCurrentPage(2);
      var quote = 'Netherfield Park';
      var range = findText(container, quote);
      var contentStr = fixtures.pdfPages.join('');
      var expectedPos = contentStr.replace(/\n/g,'').lastIndexOf(quote);

      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var position = selectors[0];
        assert.equal(position.start, expectedPos);
        assert.equal(position.end, expectedPos + quote.length);
      });
    });

    it('returns a quote selector with the correct quote', function () {
      viewer.setCurrentPage(2);
      var range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var quote = selectors[1];

        assert.deepEqual(quote, {
          type: 'TextQuoteSelector',
          exact: 'Netherfield Park',
          prefix: 'im one day, "have you heard that',
          suffix: ' is occupied again?" ',
        });
      });
    });

    it('returns selector when range starts at end of text node with no next siblings', function () {
      // this problem is referenced in client issue #122
      // But what is happening is the startContainer is referencing a text
      // elment inside of a node. The logic in pdf#describe() was assuming if the
      // selection was not middle of the word, the text node would have a nextSibling.
      // However, if the selection is at the end of the only text node of its
      // parent set, this fails.


      viewer.setCurrentPage(3);

      var quote = 'NODE B';

      // this selects NODE A text node
      var textNodeSelected = container.querySelector('.textLayer div').firstChild;
      var staticRange = findText(container, quote);

      var range = {
        // put the selection at the very end of the node
        startOffset: textNodeSelected.length,
        startContainer: textNodeSelected,
        endOffset: staticRange.endOffset,
        endContainer: staticRange.endContainer,
        commonAncestorContainer: staticRange.commonAncestorContainer,
      };

      var contentStr = fixtures.pdfPages.join('');
      var expectedPos = contentStr.replace(/\n/g,'').lastIndexOf(quote);

      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var position = selectors[0];
        assert.equal(position.start, expectedPos);
        assert.equal(position.end, expectedPos + quote.length);
      });
    });
  });

  describe('#anchor', function () {
    it('anchors previously created selectors if the page is rendered', function () {
      viewer.setCurrentPage(2);
      var range = findText(container, 'My dear Mr. Bennet');
      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var position = selectors[0];
        var quote = selectors[1];

        // Test that all of the selectors anchor and that each selector individually
        // anchors correctly as well
        var subsets = [
          [position, quote],
          [position],
          [quote],
        ];
        var subsetsAnchored = subsets.map(function (subset) {
          var types = subset.map(function (s) { return s.type; });
          var description = 'anchoring failed with ' + types.join(', ');

          return pdfAnchoring.anchor(container, subset).then(function (anchoredRange) {
            assert.equal(anchoredRange.toString(), range.toString(), description);
          }).catch(function (err) {
            console.warn(description);
            throw err;
          });
        });
        return Promise.all(subsetsAnchored);
      });
    });

    [{
      // Position on same page as quote but different text.
      offset: 5,
    },{
      // Position on a different page to the quote.
      offset: fixtures.pdfPages[0].length + 10,
    },{
      // Position invalid for document.
      offset: 100000,
    }].forEach(({ offset }) => {
      it('anchors using a quote if the position selector fails', function () {
        viewer.setCurrentPage(0);
        var range = findText(container, 'Pride And Prejudice');
        return pdfAnchoring.describe(container, range).then(function (selectors) {
          var position = selectors[0];
          var quote = selectors[1];

          position.start += offset;
          position.end += offset;

          return pdfAnchoring.anchor(container, [position, quote]);
        }).then(range => {
          assert.equal(range.toString(), 'Pride And Prejudice');
        });
      });
    });

    it('anchors to a placeholder element if the page is not rendered', function () {
      viewer.setCurrentPage(2);
      var range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function (selectors) {
        viewer.setCurrentPage(0);
        return pdfAnchoring.anchor(container, selectors);
      }).then(function (anchoredRange) {
        assert.equal(anchoredRange.toString(), 'Loading annotations…');
      });
    });
  });

});
