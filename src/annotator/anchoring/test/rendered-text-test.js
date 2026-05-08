import { assert } from 'chai';

import { renderedTextFromRange, renderedTextOf } from '../rendered-text';

describe('annotator/anchoring/rendered-text', () => {
  describe('renderedTextOf', () => {
    it('replaces <br> with a space', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';

      assert.equal(renderedTextOf(container), 'foo bar');
    });

    it('preserves whitespace and block-tag boundaries (no collapse)', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo  bar</p><p>baz</p>';

      // Same as textContent: no collapsing of consecutive spaces, no
      // synthesized space at the </p><p> boundary.
      assert.equal(renderedTextOf(container), 'foo  barbaz');
    });

    it('does not modify the original element', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';

      renderedTextOf(container);

      assert.ok(container.querySelector('br'));
    });
  });

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
  });
});
