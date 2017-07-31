'use strict';

/**
 * Implementation-independent tests for highlighter implementations.
 */

var { toRange } = require('dom-anchor-text-position');

var Range = require('../../anchoring/range');
var { createHighlighter } = require('../index');

var elementsFromPoint = require('./elements-from-point');

function highlightElementsFromPoint(root, x, y) {
  return elementsFromPoint(root, x, y).filter(el =>
    el.localName === 'rect' || el.localName === 'hypothesis-highlight'
  );
}

function testHighlighter(name, type) {
  describe(name, () => {
    var highlighter;
    var styleEl;
    var el;

    /**
     * Highlight the text between two character offsets.
     *
     * @param {Highlighter} highlighter
     * @param {Element} element
     * @param {number} start - Start character offset
     * @param {number} end - End character offset
     */
    function highlightText(element, start, end) {
      var rng = toRange(element, { start, end });
      var normedRange = Range.sniff(rng).normalize();
      var rangeHighlights = highlighter.highlightRange(normedRange);
      return rangeHighlights;
    }

    before(() => {
      styleEl = document.createElement('style');
      styleEl.textContent = `
      .annotator-hl {
        fill: yellow;
        background-color: yellow;
        opacity: 0.2;
      }
      `;
      document.head.appendChild(styleEl);
      highlighter = createHighlighter(type);
    });

    after(() => {
      styleEl.remove();
      highlighter.dispose();
    });

    beforeEach(() => {
      el = document.createElement('div');
      document.body.appendChild(el);

      el.style.width = '100px';
      el.style.height = '100px';
    });

    afterEach(() => {
      el.remove();
    });

    describe('#highlightRange', () => {
      it('should highlight text in the range', () => {
        el.textContent = 'Test content';

        highlightText(el, 0, 10);

        var { left, top } = el.getBoundingClientRect();
        var highlightEls = highlightElementsFromPoint(document.body, 10 + left, 5 + top);
        assert.equal(highlightEls.length, 1);
      });

      it('should highlight overlapping ranges', () => {
        el.textContent = 'Test content';

        highlightText(el, 0, 10);
        highlightText(el, 0, 10);

        var { left, top } = el.getBoundingClientRect();
        var highlightEls = highlightElementsFromPoint(document.body, 10 + left, 5 + top);
        assert.equal(highlightEls.length, 2);
      });
    });

    describe('#onHighlightsChanged', () => {
      it('should be called when the highlight regions change', () => {
      });
    });

    describe('#toggleFocusForHighlights', () => {
      it('should render the highlights in blue when focused', () => {
      });

      it('should render the highlights in yellow when not focused', () => {
      });
    });

    describe('#registerEventHandlers', () => {
      function mouseEvent(type, x, y) {
        var evt = new Event(type, {
          bubbles: true,
          cancelable: true,
        });
        evt.clientX = x;
        evt.clientY = y;
        return evt;
      }

      context('for a single highlight', () => {
        var highlightEl;
        var onClick;
        var onMouseOver;
        var onMouseOut;

        beforeEach(() => {
          onClick = sinon.stub();
          onMouseOver = sinon.stub();
          onMouseOut = sinon.stub();

          highlighter.registerEventHandlers({
            click: onClick,
            mouseover: onMouseOver,
            mouseout: onMouseOut,
          });

          el.textContent = 'Test content';
          [ highlightEl ] = highlightText(el, 0, 10);
        });

        function highlightPos() {
          var { left, top } = highlightEl.getBoundingClientRect();
          return [left + 5, top + 5];
        }

        it('should invoke callback when clicked', () => {
          var [x, y] = highlightPos();
          highlightEl.dispatchEvent(mouseEvent('click', x, y));
          assert.called(onClick);
        });

        it('should invoke callback when hovered', () => {
          var [x, y] = highlightPos();
          highlightEl.dispatchEvent(mouseEvent('mouseover', x, y));
          assert.called(onMouseOver);
        });

        it('should invoke callback when un-hovered', () => {
          var [x, y] = highlightPos();
          highlightEl.dispatchEvent(mouseEvent('mouseover', x, y));
          highlightEl.dispatchEvent(mouseEvent('mouseout', x, y));
          assert.called(onMouseOut);
        });
      });
    });
  });
}

describe.only('annotator.highlighter', () => {
  testHighlighter('dom-wrap-highlighter', 'dom-wrap');
  testHighlighter('overlay-highlighter', 'overlay');
});
