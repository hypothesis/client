import { assert } from 'chai';

import { renderedTextOf, toNormalized, toRaw } from '../rendered-text';

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

  describe('offset translation', () => {
    it('round-trips raw <-> normalized offsets across a <br> boundary', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>foo<br>bar</p>';

      const { text, rawToNormalized, normalizedToRaw } =
        renderedTextOf(container);
      assert.equal(text.trim(), 'foo bar');

      // Raw textContent is "foobar". The 'b' at raw offset 3 maps into the
      // rendered text past the synthesized space inserted at the <br>.
      assert.equal(toNormalized(rawToNormalized, 3), 3);
      assert.equal(toRaw(normalizedToRaw, toNormalized(rawToNormalized, 3)), 3);
      // End-of-string round-trips to end-of-string.
      assert.equal(
        toRaw(normalizedToRaw, text.length),
        container.textContent.length,
      );
    });

    it('clamps out-of-range raw offsets to the start', () => {
      const container = document.createElement('div');
      container.textContent = 'abc';

      const { rawToNormalized } = renderedTextOf(container);
      assert.equal(toNormalized(rawToNormalized, -5), 0);
    });

    it('clamps non-positive normalized offsets to raw start', () => {
      const container = document.createElement('div');
      container.textContent = 'abc';

      const { normalizedToRaw } = renderedTextOf(container);
      assert.equal(toRaw(normalizedToRaw, 0), 0);
      assert.equal(toRaw(normalizedToRaw, -10), 0);
    });

    it('handles whitespace-only content', () => {
      const container = document.createElement('div');
      container.textContent = '   ';

      const { text, rawToNormalized } = renderedTextOf(container);
      // Whitespace collapses; container is a block, so we get just the
      // closing-block synthesized space (or empty after trim).
      assert.equal(text.trim(), '');
      assert.equal(toNormalized(rawToNormalized, 1), 0);
    });
  });
});
