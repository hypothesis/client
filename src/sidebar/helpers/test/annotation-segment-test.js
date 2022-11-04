import { annotationMatchesSegment } from '../annotation-segment';

describe('annotationMatchesSegment', () => {
  it('returns true if annotation has no segment selectors', () => {
    const ann = {
      target: [
        {
          selectors: [
            {
              type: 'TextQuoteSelector',
              exact: 'test',
            },
          ],
        },
      ],
    };

    const segment = { cfi: '/2' };

    // If an annotation does not have segment information, we can't tell if
    // it matches the current segment or not. We optimistically assume it does.
    assert.isTrue(annotationMatchesSegment(ann, segment));
  });

  [
    // Both segment and annotation have CFIs.
    {
      segment: { cfi: '/2' },
      selector: { type: 'EPUBContentSelector', cfi: '/2' },
      expected: true,
    },
    {
      segment: { cfi: '/2' },
      selector: { type: 'EPUBContentSelector', cfi: '/4' },
      expected: false,
    },
    // CFIs may contain assertions in `[...]` brackets. We could use these to
    // check whether a CFI made on an older version of a document is still
    // valid. These are currently ignored however.
    {
      segment: { cfi: '/2[idref=4]' },
      selector: { type: 'EPUBContentSelector', cfi: '/2[idref=5]' },
      expected: true,
    },
    // Neither segment nor annotation have properties that can be compared.
    {
      segment: { cfi: '/2' },
      selector: { type: 'EPUBContentSelector', url: '/chapters/01.xhtml' },
      expected: false,
    },
    {
      segment: { url: '/chapters/01.xhtml' },
      selector: { type: 'EPUBContentSelector', cfi: '/2' },
      expected: false,
    },
    // Both segment and annotation have URLs that can be compared.
    {
      segment: { url: '/chapters/02.xhtml' },
      selector: { type: 'EPUBContentSelector', url: '/chapters/02.xhtml' },
      expected: true,
    },
    {
      segment: { url: '/chapters/02.xhtml' },
      selector: { type: 'EPUBContentSelector', url: '/chapters/04.xhtml' },
      expected: false,
    },
    // CFIs do not match but URLs do. The successful match wins.
    {
      segment: { cfi: '/2', url: '/chapters/02.xhtml' },
      selector: {
        type: 'EPUBContentSelector',
        cfi: '/4',
        url: '/chapters/02.xhtml',
      },
      expected: true,
    },
    // CFIs match but URLs do not. The successful match wins.
    {
      segment: { cfi: '/2', url: '/chapters/03.xhtml' },
      selector: {
        type: 'EPUBContentSelector',
        cfi: '/2',
        url: '/chapters/02.xhtml',
      },
      expected: true,
    },
  ].forEach(({ segment, selector, expected }, index) => {
    it(`returns true if CFI or URL matches current segment (${index})`, () => {
      const ann = { target: [{ selector: [selector] }] };
      assert.equal(annotationMatchesSegment(ann, segment), expected);
    });
  });
});
