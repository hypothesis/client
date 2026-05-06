import { assert } from 'chai';

import { renderedTextFromRange, renderedTextOf } from '../rendered-text';

describe('annotator/anchoring/rendered-text', () => {
  it('inserts a space at <br> boundaries', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>foo<br>bar</p>';

    assert.equal(renderedTextOf(container).text.trim(), 'foo bar');
  });

  it('inserts a space at block-tag boundaries', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>foo</p><p>bar</p><div>baz</div>';

    assert.equal(renderedTextOf(container).text.trim(), 'foo bar baz');
  });

  it('collapses runs of whitespace and suppresses leading whitespace', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>  foo \n\n bar  </p>';

    assert.equal(renderedTextOf(container).text.trim(), 'foo bar');
  });

  it('returns the rendered text of a Range', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>foo<br>bar</p>';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    assert.equal(renderedTextFromRange(range).trim(), 'foo bar');

    container.remove();
  });

  describe('offset translation', () => {
    it('round-trips raw <-> norm offsets across a <br> boundary', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';

      const { text, toNorm, toRaw } = renderedTextOf(container);
      assert.equal(text.trim(), 'foo bar');

      // Raw textContent is "foobar". The 'b' at raw offset 3 maps into the
      // rendered text past the synthesized space inserted at the <br>.
      assert.equal(toNorm(3), 3);
      assert.equal(toRaw(toNorm(3)), 3);
      // End-of-string round-trips to end-of-string.
      assert.equal(toRaw(text.length), container.textContent.length);
    });

    it('clamps out-of-range raw offsets to the start', () => {
      const container = document.createElement('div');
      container.textContent = 'abc';

      const { toNorm } = renderedTextOf(container);
      assert.equal(toNorm(-5), 0);
    });

    it('clamps non-positive norm offsets to raw start', () => {
      const container = document.createElement('div');
      container.textContent = 'abc';

      const { toRaw } = renderedTextOf(container);
      assert.equal(toRaw(0), 0);
      assert.equal(toRaw(-10), 0);
    });

    it('handles whitespace-only content', () => {
      const container = document.createElement('div');
      container.textContent = '   ';

      const { text, toNorm } = renderedTextOf(container);
      // Whitespace collapses; container is a block, so we get just the
      // closing-block synthesized space (or empty after trim).
      assert.equal(text.trim(), '');
      assert.equal(toNorm(1), 0);
    });
  });
});
