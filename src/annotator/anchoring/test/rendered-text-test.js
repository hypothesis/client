import { assert } from 'chai';

import { renderedTextFromRange } from '../rendered-text';

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

    it('preserves whitespace and block-tag boundaries (no collapse)', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo  bar</p><p>baz</p>';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);

      // Same as textContent: no collapsing of consecutive spaces, no
      // synthesized space at the </p><p> boundary.
      assert.equal(renderedTextFromRange(range), 'foo  barbaz');

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
});
