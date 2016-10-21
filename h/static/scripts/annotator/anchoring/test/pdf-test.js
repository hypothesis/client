'use strict';

var TextQuoteAnchor = require('dom-anchor-text-quote');

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
  return new TextQuoteAnchor(container, text).toRange();
}

var fixtures = {
  // Each item in this list contains the text for one page of the "PDF"
  pdfContent: [
    'Pride And Prejudice And Zombies\n' +
    'By Jane Austin and Seth Grahame-Smith ',

    'IT IS A TRUTH universally acknowledged that a zombie in possession of\n' +
    'brains must be in want of more brains. Never was this truth more plain\n' +
    'than during the recent attacks at Netherfield Park, in which a household\n' +
    'of eighteen was slaughtered and consumed by a horde of the living dead.',

    '"My dear Mr. Bennet," said his lady to him one day, "have you heard that\n' +
    'Netherfield Park is occupied again?" ',
  ],
};

describe('PDF anchoring', function () {
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
      content: fixtures.pdfContent,
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
      var contentStr = fixtures.pdfContent.join('');
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
  });

  describe('#anchor', function () {
    it('anchors previously created selectors if the page is rendered', function () {
      viewer.setCurrentPage(2);
      var range = findText(container, 'Netherfield Park');
      return pdfAnchoring.describe(container, range).then(function (selectors) {
        var position = selectors[0];
        var quote = selectors[1];

        // Test that all of the selectors anchor and that each selector individually
        // anchors correctly as well
        var subsets = [
          [position, quote],
          [position],
          // FIXME - Anchoring a quote on its own does not currently work
          // [quote],
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
