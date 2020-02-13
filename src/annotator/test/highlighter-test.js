import Range from '../anchoring/range';

import {
  highlightRange,
  removeHighlights,
  getBoundingClientRect,
} from '../highlighter';

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

    it('wraps multiple text nodes', () => {
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

      assert.equal(result.length, textNodes.length);
      result.forEach((highlight, i) => {
        assert.equal(highlight.nodeName, 'HYPOTHESIS-HIGHLIGHT');
        assert.deepEqual(Array.from(highlight.childNodes), [textNodes[i]]);
      });
    });

    it('skips text nodes that are only white space', () => {
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

      assert.equal(result.length, 2);
      assert.strictEqual(el.childNodes[0], result[0]);
      assert.strictEqual(el.childNodes[2], result[1]);
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
