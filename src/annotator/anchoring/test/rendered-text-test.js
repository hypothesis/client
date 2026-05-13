import { assert } from 'chai';

import {
  renderedOffsetToRaw,
  renderedTextFromRange,
  renderedTextOf,
} from '../rendered-text';

describe('annotator/anchoring/rendered-text', () => {
  describe('renderedTextFromRange', () => {
    it('returns the range contents with <br> replaced by a space', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container.querySelector('p'));

      assert.equal(renderedTextFromRange(range), 'foo bar');

      container.remove();
    });

    it('does not modify the original DOM', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container.querySelector('p'));

      renderedTextFromRange(range);

      assert.ok(container.querySelector('br'));

      container.remove();
    });
  });

  describe('renderedTextOf', () => {
    it('returns the textContent with <br> replaced by a space', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';

      const { text, brPositionsInText } = renderedTextOf(container);
      assert.equal(text, 'foo bar');
      assert.deepEqual(brPositionsInText, [3]);
    });

    it('records the position of each <br> in document order', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>a<br>b<br>c</p>';

      const { text, brPositionsInText } = renderedTextOf(container);
      assert.equal(text, 'a b c');
      assert.deepEqual(brPositionsInText, [1, 3]);
    });

    it('preserves other whitespace as-is (no collapse)', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo  bar</p>';

      const { text, brPositionsInText } = renderedTextOf(container);
      assert.equal(text, 'foo  bar');
      assert.deepEqual(brPositionsInText, []);
    });
  });

  describe('renderedOffsetToRaw', () => {
    it('returns the rendered offset minus the number of <br>s before it', () => {
      // "a b c" rendered; "abc" raw; brs at rendered positions 1 and 3.
      const brPositions = [1, 3];

      assert.equal(renderedOffsetToRaw(brPositions, 0), 0);
      assert.equal(renderedOffsetToRaw(brPositions, 1), 1); // at first br space, no shift yet
      assert.equal(renderedOffsetToRaw(brPositions, 2), 1); // after first br space
      assert.equal(renderedOffsetToRaw(brPositions, 3), 2); // at second br space
      assert.equal(renderedOffsetToRaw(brPositions, 4), 2); // after second br space
      assert.equal(renderedOffsetToRaw(brPositions, 5), 3); // end
    });
  });
});
