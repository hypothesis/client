import { assert } from 'chai';

import * as html from '../html';

describe('annotator/anchoring/html boundary handling', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = '<p>foo<br>bar</p>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('describes selection after <br> without leading space in exact', () => {
    const range = document.createRange();
    const textNode = container.querySelector('p').lastChild; // text node "bar"
    range.setStart(textNode, 0);
    range.setEnd(textNode, 3);

    const selectors = html.describe(container, range);
    const quoteSel = selectors.find(s => s.type === 'TextQuoteSelector');

    assert.equal(quoteSel.exact, 'bar');
    assert.isFalse(quoteSel.exact.startsWith(' '));
    assert.isFalse(quoteSel.exact.endsWith(' '));
  });

  it('anchors selection after <br> back to the same text', async () => {
    const range = document.createRange();
    const textNode = container.querySelector('p').lastChild; // text node "bar"
    range.setStart(textNode, 0);
    range.setEnd(textNode, 3);

    const selectors = html.describe(container, range);
    const anchoredRange = await html.anchor(container, selectors);

    assert.equal(anchoredRange.toString(), 'bar');
  });

  it('describes selection spanning <br> with a space in exact', () => {
    // This is the bug the PR fixes: a selection that crosses a `<br>` used
    // to produce `exact: "foobar"` because `textContent` doesn't include a
    // character for the `<br>`. With the substitution, the stored quote
    // reflects what the user actually sees in the rendered page.
    const range = document.createRange();
    range.selectNodeContents(container.querySelector('p'));

    const selectors = html.describe(container, range);
    const quoteSel = selectors.find(s => s.type === 'TextQuoteSelector');

    assert.equal(quoteSel.exact, 'foo bar');
  });

  it('anchors a selector with the substituted space back to the original range', async () => {
    const range = document.createRange();
    range.selectNodeContents(container.querySelector('p'));

    const selectors = html.describe(container, range);
    const anchoredRange = await html.anchor(container, selectors);

    // The anchored range covers the same DOM content as the original.
    // `toString()` on either Range returns "foobar" because `<br>` has no
    // character contribution to `textContent` — the substituted space lives
    // only in the stored `exact`.
    assert.equal(anchoredRange.toString(), 'foobar');
  });
});
