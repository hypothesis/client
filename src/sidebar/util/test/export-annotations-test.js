import { suggestedFilename, validateFilename } from '../export-annotations';

describe('suggestedFilename', () => {
  [
    {
      date: new Date(2023, 5, 23),
      group: null,
      expectedResult: '2023-06-23-Hypothesis',
    },
    {
      date: new Date(2019, 0, 5),
      group: null,
      expectedResult: '2019-01-05-Hypothesis',
    },
    {
      date: new Date(2020, 10, 5),
      group: { name: 'My group name' },
      expectedResult: '2020-11-05-Hypothesis-My-group-name',
    },
  ].forEach(({ date, group, expectedResult }) => {
    it('builds expected filename for provided arguments', () => {
      assert.equal(suggestedFilename({ date, group }), expectedResult);
    });
  });
});

describe('validateFilename', () => {
  ['\\n', ':', '\\', '/', '*', '?', '"', "'", '<', '>'].forEach(character => {
    it(`returns 'false' when filename includes '${character}'`, () => {
      assert.isFalse(validateFilename(`filename${character}`));
    });
  });

  ['', ''.padStart(256, 'a')].forEach(filename => {
    it('returns `false` when filename does not have a valid length', () => {
      assert.isFalse(validateFilename(filename));
    });
  });

  it('returns `true` for valid filenames', () => {
    assert.isTrue(validateFilename('my-file-name'));
  });
});
