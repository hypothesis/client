import { render } from 'preact';

import {
  getBoundingClientRect,
  getHighlightsFromPoint,
  highlightRange,
  highlightShape,
  removeHighlights,
  removeAllHighlights,
  setHighlightsFocused,
  setHighlightsVisible,
  updateClusters,
} from '../highlighter';

/**
 * Preact component that renders a simplified version of the DOM structure
 * of PDF.js pages.
 *
 * This is used to test PDF-specific highlighting behavior.
 */
function PDFPage({ showPlaceholder = false }) {
  return (
    <div
      className="page"
      style={{ position: 'relative', width: '100px', height: '100px' }}
    >
      <div className="canvasWrapper">
        {/* Canvas where PDF.js renders the visual PDF output. */}
        <canvas
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
      {/* Transparent text layer created by PDF.js to enable text selection */}
      {!showPlaceholder && (
        <div
          className="textLayer"
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Text span created to correspond to some text rendered into the canvas.
            Hypothesis creates `<hypothesis-highlight>` elements here. */}
          <span className="testText">Text to highlight</span>
        </div>
      )}
      {showPlaceholder && (
        <div className="annotator-placeholder testText">
          {/* Placeholder created to anchor annotations to if the text layer has not finished
              rendering. */}
          Loading annotations
        </div>
      )}
    </div>
  );
}

/**
 * Highlight the text in a fake PDF page.
 *
 * @param {HTMLElement} pageContainer - HTML element into which `PDFPage`
 *   component has been rendered
 * @param {string} [cssClass] additional CSS class(es) to apply to the highlight
 *   and SVG rect elements
 * @return {HighlightElement[]} - `<hypothesis-highlight>` element
 */
function highlightPDFRange(pageContainer, cssClass = '') {
  const textSpan = pageContainer.querySelector('.testText');
  const range = new Range();
  range.setStartBefore(textSpan.childNodes[0]);
  range.setEndAfter(textSpan.childNodes[0]);
  return highlightRange(range, cssClass);
}

describe('annotator/highlighter', () => {
  let containers;

  /**
   * Render a fake PDF.js page (`PDFPage`) and return its container.
   *
   * @param {string} [cssClass] additional CSS class(es) to apply to the highlight
   *   and SVG rect elements
   * @return {HTMLElement}
   */
  function createPDFPageWithHighlight(cssClass = '') {
    const container = document.createElement('div');
    containers.push(container);
    document.body.append(container);

    render(<PDFPage />, container);

    highlightPDFRange(container, cssClass);

    return container;
  }

  beforeEach(() => {
    containers = [];
  });

  afterEach(() => {
    containers.forEach(c => c.remove());
  });

  describe('highlightRange', () => {
    it('wraps a highlight span around the given range', () => {
      const text = document.createTextNode('test highlight span');
      const el = document.createElement('span');
      el.appendChild(text);
      const range = new Range();
      range.setStartBefore(text);
      range.setEndAfter(text);

      const result = highlightRange(range, 'extra-css-class');

      assert.equal(result.length, 1);
      assert.strictEqual(el.childNodes[0], result[0]);
      assert.equal(result[0].nodeName, 'HYPOTHESIS-HIGHLIGHT');
      assert.isTrue(result[0].classList.contains('hypothesis-highlight'));
      assert.isTrue(result[0].classList.contains('extra-css-class'));
    });

    const testText = 'one two three';

    [
      // Range starting at the start of text node and ending in the middle.
      [0, 5],
      // Range starting in the middle of text node and ending in the middle.
      [4, 7],
      // Range starting in the middle of text node and ending at the end.
      [4, testText.length],
      // Empty ranges.
      [0, 0],
      [5, 5],
      [testText.length, testText.length],
    ].forEach(([startPos, endPos]) => {
      it('splits text nodes when only part of one should be highlighted', () => {
        const el = document.createElement('span');
        el.append(testText);

        const range = new Range();
        range.setStart(el.firstChild, startPos);
        range.setEnd(el.firstChild, endPos);
        const result = highlightRange(range);

        const highlightedText = result.reduce(
          (str, el) => str + el.textContent,
          '',
        );
        assert.equal(highlightedText, testText.slice(startPos, endPos));
        assert.equal(el.textContent, testText);
      });
    });

    it('generates correct highlights when the start text node is split', () => {
      const el = document.createElement('span');
      el.append('foo bar baz');

      // nb. It is important for this test case that the start is in the middle
      // of a text node and the end is a point _after_ the text node. eg:
      //
      // ```
      // <div>
      //   some [text
      //   <b>]foo</b>
      // </div>
      // ```
      //
      // (Where the `[` and `]` denote the endpoints of the range)

      const range = new Range();
      range.setStart(el.firstChild, 4);
      range.setEnd(el, 1);
      highlightRange(range, '' /* cssClass */);

      assert.equal(
        el.innerHTML,
        'foo <hypothesis-highlight class="hypothesis-highlight">bar baz</hypothesis-highlight>',
      );
    });

    it('handles a range with no text nodes', () => {
      const el = document.createElement('span');

      const range = new Range();
      range.setStart(el, 0);
      range.setEnd(el, 0);
      const highlights = highlightRange(range);

      assert.deepEqual(highlights, []);
    });

    it('handles a range with no parent element', () => {
      const text = document.createTextNode('foobar');

      const range = new Range();
      range.setStart(text, 0);
      range.setEnd(text, text.data.length);
      const highlights = highlightRange(range);

      assert.deepEqual(highlights, []);
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

      const range = new Range();
      range.setStartBefore(textNodes[0]);
      range.setEndAfter(textNodes[textNodes.length - 1]);
      const result = highlightRange(range);

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

      const range = new Range();
      range.setStartBefore(textNodes[0]);
      range.setEndAfter(textNodes[textNodes.length - 1]);
      const result = highlightRange(range);

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

      const range = new Range();
      range.setStartBefore(txt);
      range.setEndAfter(txt2);
      const result = highlightRange(range);

      assert.equal(result.length, 1);
      assert.equal(result[0].textContent, 'one two');
    });

    it('skips whitespace-only text node spans, except inside <span>s', () => {
      const el = document.createElement('div');
      el.appendChild(document.createTextNode(' '));
      el.appendChild(document.createTextNode(''));
      el.appendChild(document.createTextNode('   '));
      const range = new Range();
      range.setStartBefore(el.childNodes[0]);
      range.setEndAfter(el.childNodes[2]);

      const result = highlightRange(range);

      assert.equal(result.length, 0);
    });

    it('wraps whitespace-only text if <span> parent', () => {
      // Real-world examples:
      // - Codeblocks on https://h.readthedocs.io/en/latest/developing/install
      // - Text layer on https://archive.org/details/goodytwoshoes00newyiala
      const parent = document.createElement('div');
      const word1 = document.createElement('span');
      word1.textContent = 'one';
      parent.appendChild(word1);

      // This will be ignored because the parent is a div.
      parent.appendChild(document.createTextNode(' '));

      // This will not be ignored because the parent is a span.
      const space = document.createElement('span');
      space.textContent = ' ';
      parent.appendChild(space);

      const word2 = document.createElement('span');
      word2.textContent = 'two';
      parent.appendChild(word2);
      const range = new Range();
      range.setStartBefore(word1.childNodes[0]);
      range.setEndAfter(word2.childNodes[0]);

      const result = highlightRange(range);
      assert.equal(result.length, 3);
      assert.equal(result[0].textContent, 'one');
      assert.equal(result[1].textContent, ' ');
      assert.equal(result[2].textContent, 'two');
    });

    context('when the highlighted text is part of a PDF.js text layer', () => {
      it("removes the highlight element's background color", () => {
        const page = createPDFPageWithHighlight();
        const highlight = page.querySelector('hypothesis-highlight');
        assert.isTrue(highlight.classList.contains('is-transparent'));
      });

      it('add extra CSS classes to both the highlight and SVG rect', () => {
        const page = createPDFPageWithHighlight('extra-css-class');
        const highlight = page.querySelector('hypothesis-highlight');
        const svgRect = page.querySelector('rect');
        assert.isTrue(highlight.classList.contains('extra-css-class'));
        assert.isTrue(svgRect.classList.contains('extra-css-class'));
      });

      it('creates an SVG layer above the PDF canvas and draws a highlight in that', () => {
        const page = createPDFPageWithHighlight();
        const canvas = page.querySelector('canvas');
        const svgLayer = page.querySelector('svg.hypothesis-highlight-layer');

        // Verify SVG layer was created.
        assert.ok(svgLayer);
        assert.equal(svgLayer.previousElementSibling, canvas);

        // Check that an SVG graphic element was created for the highlight.
        const highlight = page.querySelector('hypothesis-highlight');
        const svgRect = page.querySelector('rect');
        assert.ok(svgRect);
        assert.equal(highlight.svgHighlight, svgRect);
        assert.equal(svgRect.getAttribute('class'), 'hypothesis-svg-highlight');

        // The two highlight representations should be positioned in the same place.
        const svgRectBox = svgRect.getBoundingClientRect();
        const highlightBox = highlight.getBoundingClientRect();
        assert.closeTo(svgRectBox.left, highlightBox.left, 1);
        assert.closeTo(svgRectBox.top, highlightBox.top, 1);
        assert.closeTo(svgRectBox.width, highlightBox.width, 1);
        assert.closeTo(svgRectBox.height, highlightBox.height, 1);
      });

      it('re-uses the existing SVG layer for the page if present', () => {
        // Create a PDF page with a single highlight.
        const page = createPDFPageWithHighlight();

        // Create a second highlight on the same page.
        highlightPDFRange(page);

        // There should be multiple highlights.
        assert.equal(page.querySelectorAll('hypothesis-highlight').length, 2);

        // ... but only one SVG layer.
        assert.equal(page.querySelectorAll('svg').length, 1);
        // ... with multiple <rect>s
        assert.equal(
          page.querySelector('svg').querySelectorAll('rect').length,
          2,
        );
      });

      it('does not create an SVG highlight if the canvas is not found', () => {
        const container = document.createElement('div');
        render(<PDFPage />, container);

        // Remove canvas. This might be missing if the DOM structure looks like
        // PDF.js but isn't, or perhaps a future PDF.js update or fork changes
        // the DOM structure significantly. In that case, we'll fall back to
        // regular CSS-based highlighting.
        container.querySelector('canvas').remove();

        const [highlight] = highlightPDFRange(container);

        assert.isFalse(highlight.classList.contains('is-transparent'));
        assert.isNull(container.querySelector('rect'));
        assert.notOk(highlight.svgHighlight);
      });

      it('does not create an SVG highlight for placeholder highlights', () => {
        const container = document.createElement('div');
        render(<PDFPage showPlaceholder={true} />, container);
        const [highlight] = highlightPDFRange(container);

        // If the highlight is a placeholder, the highlight element should still
        // be created.
        assert.ok(highlight);
        assert.equal(highlight.textContent, 'Loading annotations');

        // ...but the highlight should be visually hidden so the SVG should
        // not be created.
        assert.isNull(container.querySelector('rect'));
      });
    });
  });

  describe('highlightShape', () => {
    [
      {
        // Rect covering whole area of anchor element.
        shape: {
          type: 'rect',
          left: 0,
          top: 0,
          right: 1,
          bottom: 1,
        },
        expected: {
          top: 'calc(0% - 5px)',
          left: 'calc(0% - 5px)',
          // 100% anchor width - 2 * 3px highlight border
          width: 'calc(100% - 6px)',
          // 100% anchor height - 2 * 3px highlight border
          height: 'calc(100% - 6px)',
        },
      },
      {
        // Point at top-left corner of anchor element.
        shape: { type: 'point', x: 0, y: 0 },
        expected: {
          top: 'calc(0% - 5px)',
          left: 'calc(0% - 5px)',
          width: '10px',
          height: '10px',
        },
      },
      // Unsupported shapes currently generate highlights with no position
      // properties set.
      {
        shape: { type: 'star' },
        expected: {
          top: '',
          left: '',
          width: '',
          height: '',
        },
      },
    ].forEach(({ shape, expected }) => {
      it('creates highlight element for shape anchor', () => {
        const anchor = document.createElement('div');
        document.body.append(anchor);

        try {
          anchor.style.width = '100px';
          anchor.style.height = '200px';
          anchor.style.position = 'relative';
          anchor.style.borderWidth = '5px';
          const shapeAnchor = {
            anchor,
            shape,
          };
          const highlights = highlightShape(shapeAnchor);
          assert.equal(highlights.length, 1);

          const highlight = highlights[0];
          assert.equal(highlight.localName, 'hypothesis-highlight');
          assert.equal(highlight.style.left, expected.left);
          assert.equal(highlight.style.top, expected.top);
          assert.equal(highlight.style.width, expected.width);
          assert.equal(highlight.style.height, expected.height);
        } finally {
          anchor.remove();
        }
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
      const page = createPDFPageWithHighlight();
      const highlight = page.querySelector('hypothesis-highlight');

      assert.instanceOf(highlight.svgHighlight, SVGElement);
      assert.equal(page.querySelectorAll('rect').length, 1);

      removeHighlights([highlight]);

      assert.equal(page.querySelectorAll('rect').length, 0);
    });
  });

  /**
   * Add some text nodes to `root` and highlight them with `highlightRange`.
   *
   * Returns all the highlight elements.
   */
  function createHighlights(root, cssClass = '') {
    const highlights = [];

    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.textContent = 'Test text';
      const range = new Range();
      range.setStartBefore(span.childNodes[0]);
      range.setEndAfter(span.childNodes[0]);
      root.appendChild(span);
      highlights.push(...highlightRange(range, cssClass));
    }

    return highlights;
  }

  describe('updateClusters', () => {
    const nestingLevel = el =>
      parseInt(el.getAttribute('data-nesting-level'), 10);
    const clusterLevel = el =>
      parseInt(el.getAttribute('data-cluster-level'), 10);

    it('sets nesting data on highlight elements', () => {
      const container = document.createElement('div');
      render(<PDFPage />, container);

      const highlights = [
        ...highlightPDFRange(container, 'user-annotations'),
        ...highlightPDFRange(container, 'user-annotations'),
        ...highlightPDFRange(container, 'user-annotations'),
        ...highlightPDFRange(container, 'other-content'),
      ];

      updateClusters(container);

      assert.equal(nestingLevel(highlights[0]), 0);
      assert.equal(nestingLevel(highlights[1]), 1);
      assert.equal(nestingLevel(highlights[2]), 2);
      assert.equal(nestingLevel(highlights[3]), 3);

      assert.equal(clusterLevel(highlights[0]), 0);
      assert.equal(clusterLevel(highlights[1]), 1);
      assert.equal(clusterLevel(highlights[2]), 2);
      assert.equal(clusterLevel(highlights[3]), 0);
    });

    it('sets nesting data on SVG highlights', () => {
      const container = document.createElement('div');
      render(<PDFPage />, container);

      const highlights = [
        ...highlightPDFRange(container, 'user-annotations'),
        ...highlightPDFRange(container, 'user-annotations'),
      ];

      updateClusters(container);

      assert.equal(nestingLevel(highlights[0].svgHighlight), 0);
      assert.equal(nestingLevel(highlights[1].svgHighlight), 1);

      assert.equal(clusterLevel(highlights[0].svgHighlight), 0);
      assert.equal(clusterLevel(highlights[1].svgHighlight), 1);
    });

    it('reorders SVG highlights based on nesting level', () => {
      const container = document.createElement('div');
      render(<PDFPage />, container);

      // SVG highlights for these highlights will be added in order.
      // These first three highlights will nest.
      highlightPDFRange(container, 'user-annotations');
      highlightPDFRange(container, 'user-annotations');
      highlightPDFRange(container, 'other-content');
      // these second three highlights are outer highlights
      createHighlights(container.querySelector('.textLayer'));

      updateClusters(container);

      const orderedNestingLevels = Array.from(
        container.querySelectorAll('rect'),
      ).map(el => nestingLevel(el));

      assert.deepEqual(orderedNestingLevels, [0, 0, 0, 0, 1, 2]);
    });

    it('orders focused SVG highlights last regardless of nesting level', () => {
      const container = document.createElement('div');
      render(<PDFPage />, container);

      const svgEls = () => Array.from(container.querySelectorAll('rect'));
      const orderedNestingLevels = () => svgEls().map(el => nestingLevel(el));

      // This highlight has a nesting level of 0
      const toFocus = highlightPDFRange(container, 'user-annotations');
      highlightPDFRange(container, 'user-annotations'); // Nesting level 1
      highlightPDFRange(container, 'other-content'); // Nesting level 2

      // Initial nesting-based ordering
      updateClusters(container);

      assert.equal(svgEls().length, 3);
      assert.deepEqual(orderedNestingLevels(), [0, 1, 2]);

      // Focus the first, outermost highlight
      setHighlightsFocused(toFocus, true);

      assert.equal(
        svgEls().length,
        4,
        'cloned, focused highlight element added',
      );

      updateClusters(container);

      assert.deepEqual(
        orderedNestingLevels(),
        [0, 1, 2, 0],
        'Focused highlight remains at end after re-ordering',
      );

      setHighlightsFocused(toFocus, false);

      assert.equal(svgEls().length, 3, 'Cloned element removed when unfocused');
      assert.deepEqual(orderedNestingLevels(), [0, 1, 2]);
    });
  });

  describe('removeAllHighlights', () => {
    it('removes all highlight elements under the root element', () => {
      const root = document.createElement('div');

      createHighlights(root);

      const textContent = root.textContent;
      assert.equal(root.querySelectorAll('hypothesis-highlight').length, 3);

      removeAllHighlights(root);

      assert.equal(root.querySelectorAll('hypothesis-highlight').length, 0);
      assert.equal(root.textContent, textContent);
    });

    it('does nothing if there are no highlights', () => {
      const root = document.createElement('div');
      root.innerHTML = '<span>one</span>-<span>two</span>-<span>three</span>';

      removeAllHighlights(root);

      assert.equal(root.textContent, 'one-two-three');
    });
  });

  describe('setHighlightsFocused', () => {
    it('adds class to HTML highlights when focused', () => {
      const root = document.createElement('div');
      const highlights = createHighlights(root);

      setHighlightsFocused(highlights, true);

      highlights.forEach(h =>
        assert.isTrue(h.classList.contains('hypothesis-highlight-focused')),
      );
    });

    it('removes class from HTML highlights when not focused', () => {
      const root = document.createElement('div');
      const highlights = createHighlights(root);

      setHighlightsFocused(highlights, true);
      setHighlightsFocused(highlights, false);

      highlights.forEach(h =>
        assert.isFalse(h.classList.contains('hypothesis-highlight-focused')),
      );
    });

    it('leaves highlights focused if they are focused again', () => {
      const root = document.createElement('div');
      const highlights = createHighlights(root);

      setHighlightsFocused(highlights, true);
      setHighlightsFocused(highlights, true);

      highlights.forEach(h =>
        assert.isTrue(h.classList.contains('hypothesis-highlight-focused')),
      );
    });

    it('clones and sets focus class on focused SVG highlights in PDFs', () => {
      const root = document.createElement('div');
      render(<PDFPage />, root);
      const highlights = [
        ...highlightPDFRange(root),
        ...highlightPDFRange(root),
      ];
      const svgLayer = root.querySelector('svg');

      assert.equal(svgLayer.lastChild, highlights[1].svgHighlight);
      assert.equal(svgLayer.children.length, highlights.length);

      setHighlightsFocused([highlights[0]], true);

      assert.equal(svgLayer.children.length, highlights.length + 1);
      assert.isTrue(svgLayer.lastChild.hasAttribute('data-is-focused'));
      assert.equal(
        svgLayer.lastChild.getAttribute('data-focused-id'),
        highlights[0].svgHighlight.getAttribute('data-focused-id'),
      );
    });

    it('leaves SVG highlights focused if highlights are focused again', () => {
      const root = document.createElement('div');
      render(<PDFPage />, root);
      const highlights = [
        ...highlightPDFRange(root),
        ...highlightPDFRange(root),
      ];
      const svgLayer = root.querySelector('svg');

      setHighlightsFocused([highlights[0]], true);

      assert.equal(svgLayer.children.length, highlights.length + 1);

      setHighlightsFocused([highlights[0]], true);

      assert.equal(
        svgLayer.children.length,
        highlights.length + 1,
        'No additional cloned highlights are added',
      );
      assert.equal(
        svgLayer.lastChild.getAttribute('data-focused-id'),
        highlights[0].svgHighlight.getAttribute('data-focused-id'),
      );
    });

    it('removes cloned SVG highlights when associated highlight is unfocused', () => {
      const root = document.createElement('div');
      render(<PDFPage />, root);
      const highlights = [
        ...highlightPDFRange(root),
        ...highlightPDFRange(root),
      ];
      const svgLayer = root.querySelector('svg');

      setHighlightsFocused([highlights[0]], true);
      setHighlightsFocused([highlights[0]], false);

      assert.equal(svgLayer.querySelectorAll('rect').length, highlights.length);
      assert.equal(svgLayer.querySelectorAll('[data-focused-id]').length, 0);
      assert.equal(svgLayer.querySelectorAll('[data-is-focused]').length, 0);
    });

    it('removes focused SVG highlights when associated highlight is removed', () => {
      const root = document.createElement('div');
      render(<PDFPage />, root);
      const highlights = [
        ...highlightPDFRange(root),
        ...highlightPDFRange(root),
      ];
      const svgLayer = root.querySelector('svg');

      setHighlightsFocused([highlights[0]], true);

      // Both the "original" SVG highlight and its cloned focused element
      // get a `data-focused-id` attribute to associate them
      assert.equal(svgLayer.querySelectorAll('[data-focused-id]').length, 2);
      // Only the cloned element gets the `data-is-focused` attribute
      assert.equal(svgLayer.querySelectorAll('[data-is-focused]').length, 1);

      // Removing a highlight without unfocusing it first
      removeHighlights([highlights[0]]);

      assert.equal(
        svgLayer.querySelectorAll('rect').length,
        highlights.length - 1,
      );
      assert.equal(svgLayer.querySelectorAll('[data-focused-id]').length, 0);
      assert.equal(svgLayer.querySelectorAll('[data-is-focused]').length, 0);
    });
  });

  describe('setHighlightsVisible', () => {
    it('adds class to root when `visible` is `true`', () => {
      const root = document.createElement('div');
      setHighlightsVisible(root, true);
      assert.isTrue(root.classList.contains('hypothesis-highlights-always-on'));
    });

    it('removes class from root when `visible` is `false`', () => {
      const root = document.createElement('div');

      setHighlightsVisible(root, true);
      setHighlightsVisible(root, false);

      assert.isFalse(
        root.classList.contains('hypothesis-highlights-always-on'),
      );
    });
  });

  describe('getHighlightsFromPoint', () => {
    const createHighlight = type => {
      const hl = document.createElement('hypothesis-highlight');
      hl.style.position = 'absolute';
      hl.style.left = '100px';
      hl.style.top = '200px';
      hl.style.width = '10px';
      hl.style.height = '10px';

      if (type === 'shape') {
        // Disable pointer events to match real shape highlights.
        hl.style.pointerEvents = 'none';
        hl.classList.add('hypothesis-shape-highlight');
      }

      return hl;
    };

    it('returns all the visible highlights at the given point', () => {
      const container = document.createElement('div');
      const elements = [
        createHighlight('text'),
        createHighlight('text'),
        createHighlight('shape'),
        document.createElement('not-a-highlight'),
      ];
      document.body.append(container);

      for (const hl of elements) {
        container.append(hl);
      }

      try {
        // Position with highlights, when visible.
        const x = 105;
        const y = 205;
        setHighlightsVisible(container, true);
        assert.sameMembers(
          getHighlightsFromPoint(x, y),
          elements.filter(hl => hl.localName === 'hypothesis-highlight'),
        );

        // Position with no highlights, when visible.
        assert.deepEqual(getHighlightsFromPoint(0, 0), []);

        // Position with highlights, when hidden.
        setHighlightsVisible(container, false);
        assert.deepEqual(getHighlightsFromPoint(x, y), []);
      } finally {
        container.remove();
      }
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
