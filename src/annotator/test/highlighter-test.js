import { createElement, render } from 'preact';

import Range from '../anchoring/range';

import {
  highlightRange,
  removeHighlights,
  getBoundingClientRect,
} from '../highlighter';

/**
 * Preact component that renders a simplified version of the DOM structure
 * of PDF.js pages.
 *
 * This is used to test PDF-specific highlighting behavior.
 */
function PdfPage() {
  return (
    <div className="page">
      <div className="canvasWrapper">
        {/* Canvas where PDF.js renders the visual PDF output. */}
        <canvas />
      </div>
      {/* Transparent text layer created by PDF.js to enable text selection */}
      <div className="textLayer">
        {/* Text span created to correspond to some text rendered into the canvas.
            Hypothesis creates `<hypothesis-highlight>` elements here. */}
        <span className="testText">Text to highlight</span>
      </div>
    </div>
  );
}

/**
 * Highlight the text in a fake PDF page.
 *
 * @param {HTMLElement} - HTML element into which `PdfPage` component has been
 *   rendered
 * @return {HTMLElement} - `<hypothesis-highlight>` element
 */
function highlightPdfRange(pdfPage) {
  const textSpan = pdfPage.querySelector('.testText');
  const r = new Range.NormalizedRange({
    commonAncestor: textSpan,
    start: textSpan.childNodes[0],
    end: textSpan.childNodes[0],
  });
  return highlightRange(r);
}

/**
 * Render a fake PDF.js page (`PdfPage`) and return its container.
 *
 * @return {HTMLElement}
 */
function createPdfPageWithHighlight() {
  const container = document.createElement('div');
  render(<PdfPage />, container);

  highlightPdfRange(container);

  return container;
}

describe('annotator/highlighter', () => {
  describe('highlightRange', () => {
    it('wraps a highlight span around the given range', () => {
      const txt = document.createTextNode('test highlight span');
      const el = document.createElement('span');
      el.appendChild(txt);
      const r = new Range.NormalizedRange({
        commonAncestor: el,
        start: txt,
        end: txt,
      });

      const result = highlightRange(r);

      assert.equal(result.length, 1);
      assert.strictEqual(el.childNodes[0], result[0]);
      assert.equal(result[0].nodeName, 'HYPOTHESIS-HIGHLIGHT');
      assert.isTrue(result[0].classList.contains('hypothesis-highlight'));
    });

    it('wraps multiple text nodes which are not adjacent', () => {
      const strings = ['hello', ' Brave ', ' New ', ' World'];
      const textNodes = strings.map(s => document.createTextNode(s));

      const el = document.createElement('span');
      textNodes.forEach(n => {
        const childEl = document.createElement('span');
        childEl.append(n);
        el.append(childEl);
      });

      const r = new Range.NormalizedRange({
        commonAncestor: el,
        start: textNodes[0],
        end: textNodes[textNodes.length - 1],
      });
      const result = highlightRange(r);

      assert.equal(result.length, textNodes.length);
      result.forEach((highlight, i) => {
        assert.equal(highlight.nodeName, 'HYPOTHESIS-HIGHLIGHT');
        assert.deepEqual(Array.from(highlight.childNodes), [textNodes[i]]);
      });
    });

    it('wraps multiple text nodes which are adjacent', () => {
      const strings = ['hello', ' Brave ', ' New ', ' World'];
      const textNodes = strings.map(s => document.createTextNode(s));

      const el = document.createElement('span');
      textNodes.forEach(n => el.append(n));

      const r = new Range.NormalizedRange({
        commonAncestor: el,
        start: textNodes[0],
        end: textNodes[textNodes.length - 1],
      });
      const result = highlightRange(r);

      assert.equal(result.length, 1);
      assert.equal(el.childNodes.length, 1);
      assert.equal(el.childNodes[0], result[0]);
      assert.equal(result[0].textContent, strings.join(''));
    });

    it('wraps a span of text nodes which include space-only nodes', () => {
      const txt = document.createTextNode('one');
      const blank = document.createTextNode(' ');
      const txt2 = document.createTextNode('two');
      const el = document.createElement('span');
      el.appendChild(txt);
      el.appendChild(blank);
      el.appendChild(txt2);
      const r = new Range.NormalizedRange({
        commonAncestor: el,
        start: txt,
        end: txt2,
      });

      const result = highlightRange(r);

      assert.equal(result.length, 1);
      assert.equal(result[0].textContent, 'one two');
    });

    it('skips text node spans which consist only of spaces', () => {
      const el = document.createElement('span');
      el.appendChild(document.createTextNode(' '));
      el.appendChild(document.createTextNode(''));
      el.appendChild(document.createTextNode('   '));
      const r = new Range.NormalizedRange({
        commonAncestor: el,
        start: el.childNodes[0],
        end: el.childNodes[2],
      });

      const result = highlightRange(r);

      assert.equal(result.length, 0);
    });

    context('when the highlighted text is part of a PDF.js text layer', () => {
      it("removes the highlight element's background color", () => {
        const page = createPdfPageWithHighlight();
        const highlight = page.querySelector('hypothesis-highlight');
        assert.isTrue(highlight.classList.contains('is-transparent'));
      });

      it('creates an SVG layer above the PDF canvas and draws a highlight in that', () => {
        const page = createPdfPageWithHighlight();
        const canvas = page.querySelector('canvas');
        const svgLayer = page.querySelector('svg');

        // Verify SVG layer was created.
        assert.ok(svgLayer);
        assert.equal(svgLayer.previousElementSibling, canvas);

        // Check that an SVG graphic element was created for the highlight.
        const highlight = page.querySelector('hypothesis-highlight');
        const svgRect = page.querySelector('rect');
        assert.ok(svgRect);
        assert.equal(highlight.svgHighlight, svgRect);
      });

      it('re-uses the existing SVG layer for the page if present', () => {
        // Create a PDF page with a single highlight.
        const page = createPdfPageWithHighlight();

        // Create a second highlight on the same page.
        highlightPdfRange(page);

        // There should be multiple highlights.
        assert.equal(page.querySelectorAll('hypothesis-highlight').length, 2);

        // ... but only one SVG layer.
        assert.equal(page.querySelectorAll('svg').length, 1);
        // ... with multiple <rect>s
        assert.equal(
          page.querySelector('svg').querySelectorAll('rect').length,
          2
        );
      });

      it('does not create an SVG highlight if the canvas is not found', () => {
        const container = document.createElement('div');
        render(<PdfPage />, container);

        // Remove canvas. This might be missing if the DOM structure looks like
        // PDF.js but isn't, or perhaps a future PDF.js update or fork changes
        // the DOM structure significantly. In that case, we'll fall back to
        // regular CSS-based highlighting.
        container.querySelector('canvas').remove();

        const [highlight] = highlightPdfRange(container);

        assert.isFalse(highlight.classList.contains('is-transparent'));
        assert.isNull(container.querySelector('rect'));
        assert.notOk(highlight.svgHighlight);
      });
    });
  });

  describe('removeHighlights', () => {
    it('unwraps all the elements', () => {
      const txt = document.createTextNode('word');
      const el = document.createElement('span');
      const hl = document.createElement('span');
      const div = document.createElement('div');
      el.appendChild(txt);
      hl.appendChild(el);
      div.appendChild(hl);

      removeHighlights([hl]);

      assert.isNull(hl.parentNode);
      assert.strictEqual(el.parentNode, div);
    });

    it('does not fail on nodes with no parent', () => {
      const txt = document.createTextNode('no parent');
      const hl = document.createElement('span');
      hl.appendChild(txt);

      removeHighlights([hl]);
    });

    it('removes any associated SVG elements external to the highlight element', () => {
      const page = createPdfPageWithHighlight();
      const highlight = page.querySelector('hypothesis-highlight');

      assert.instanceOf(highlight.svgHighlight, SVGElement);
      assert.equal(page.querySelectorAll('rect').length, 1);

      removeHighlights([highlight]);

      assert.equal(page.querySelectorAll('rect').length, 0);
    });
  });

  describe('getBoundingClientRect', () => {
    it('returns the bounding box of all the highlight client rectangles', () => {
      const rects = [
        {
          top: 20,
          left: 15,
          bottom: 30,
          right: 25,
        },
        {
          top: 10,
          left: 15,
          bottom: 20,
          right: 25,
        },
        {
          top: 15,
          left: 20,
          bottom: 25,
          right: 30,
        },
        {
          top: 15,
          left: 10,
          bottom: 25,
          right: 20,
        },
      ];
      const fakeHighlights = rects.map(r => {
        return { getBoundingClientRect: () => r };
      });

      const result = getBoundingClientRect(fakeHighlights);

      assert.equal(result.left, 10);
      assert.equal(result.top, 10);
      assert.equal(result.right, 30);
      assert.equal(result.bottom, 30);
    });
  });
});
