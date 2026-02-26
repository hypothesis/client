import { assert } from 'chai';

import {
  renderedTextFromRange,
  renderedTextWithOffsets,
} from '../rendered-text';

describe('annotator/anchoring/rendered-text', () => {
  it('normalizes rendered text with line breaks and block boundaries', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>foo<br>bar</p><div>baz</div>';
    const range = document.createRange();
    range.selectNodeContents(container);

    const text = renderedTextFromRange(range);
    assert.equal(text.trim(), 'foo bar baz');
  });

  it('provides raw/normalized offset mappings', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>foo<br>bar</p>';

    const { text, toNorm, toRaw } = renderedTextWithOffsets(container);

    const trimmed = text.trim();
    assert.equal(trimmed, 'foo bar');
    // Raw textContent is "foobar". The inserted space should map to the
    // boundary between raw offsets 3 and 3.
    assert.equal(toNorm(3), 3);
    assert.equal(toRaw(3), 3);
    // End of raw text maps to end of normalized text (ignoring trailing space).
    assert.equal(toNorm(container.textContent.length), trimmed.length);
    assert.equal(toRaw(trimmed.length), container.textContent.length);
  });

  it('maps out-of-range raw offsets to 0', () => {
    const container = document.createElement('div');
    container.textContent = 'abc';

    const { toNorm } = renderedTextWithOffsets(container);

    assert.equal(toNorm(-5), 0);
  });

  it('maps norm offsets <= 0 to raw start', () => {
    const container = document.createElement('div');
    container.textContent = 'abc';

    const { toRaw } = renderedTextWithOffsets(container);

    assert.equal(toRaw(0), 0);
    assert.equal(toRaw(-10), 0);
  });

  it('falls back to 0 when no raw-to-norm mapping exists', () => {
    // Whitespace-only content collapses to empty; ensure toNorm returns 0.
    const container = document.createElement('div');
    container.textContent = '   ';

    const { toNorm } = renderedTextWithOffsets(container);

    assert.equal(toNorm(1), 0);
  });
});
