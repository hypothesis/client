'use strict';

const ViewFilter = require('../view-filter');

function isoDateWithAge(age) {
  return new Date(Date.now() - age * 1000).toISOString();
}

const poem = {
  tiger: `Tiger! Tiger! burning bright
          In the forest of the night
          When immortal  hand  or eye
          Could frame thy fearful symmetry?`,
  raven: `Once upon a midnight dreary, when I pondered, weak and weary,
          Over many a quaint and curious volume of forgotten lore-
          While I nodded, nearly napping, suddely there came a tapping,
          As of some one gently rapping, rapping at my chamber door.
          “’Tis some visitor,” I muttered, “tapping at my chamber door—
          Only this and nothing more.”`,
};

describe('sidebar/services/view-filter', () => {
  let viewFilter;
  let fakeUnicode;

  beforeEach(() => {
    fakeUnicode = {
      fold: sinon.stub().returnsArg(0),
      normalize: sinon.stub().returnsArg(0),
    };
    viewFilter = new ViewFilter(fakeUnicode);
  });

  describe('#filter', () => {
    it('applies unicode-aware case folding to filter terms', () => {
      const filters = {
        text: { terms: ['Tiger'], operator: 'and' },
      };

      viewFilter.filter([], filters);

      assert.calledWith(fakeUnicode.fold, 'Tiger');
    });
  });

  describe('filter operators', () => {
    let annotations;

    beforeEach(() => {
      annotations = [
        { id: 1, text: poem.tiger },
        { id: 2, text: poem.raven },
      ];
    });

    it('requires all terms to match for "and" operator', () => {
      const filters = {
        text: { terms: ['Tiger', 'burning', 'bright'], operator: 'and' },
      };

      const result = viewFilter.filter(annotations, filters);

      assert.deepEqual(result, [1]);
    });

    it('requires at least one term to match for "or" operator', () => {
      const filters = {
        text: { terms: ['Tiger', 'quaint'], operator: 'or' },
      };

      const result = viewFilter.filter(annotations, filters);

      assert.equal(result.length, 2);
    });
  });

  describe('"any" field', () => {
    it('finds matches in any field', () => {
      const annotations = [
        { id: 1, text: poem.tiger },
        { id: 2, user: 'Tiger' },
        { id: 3, tags: ['Tiger'] },
      ];
      const filters = { any: { terms: ['Tiger'], operator: 'and' } };

      const result = viewFilter.filter(annotations, filters);

      assert.equal(result.length, 3);
    });

    it('matches if combined fields match "and" query', () => {
      const annotation = {
        id: 1,
        text: poem.tiger,
        target: [{
          selector: [{
            type: 'TextQuoteSelector',
            exact: 'The Tiger by William Blake',
          }],
        }],
        user: 'acct:poe@edgar.com',
        tags: ['poem', 'Blake', 'Tiger'],
      };

      // A query which matches the combined fields from the annotation, but not
      // individual fields on their own.
      const filters = {
        any: { terms: ['burning', 'William', 'poem', 'bright'], operator: 'and' },
      };

      const result = viewFilter.filter([annotation], filters);

      assert.equal(result.length, 1);
    });
  });

  describe('"uri" field', () => {
    it("matches if the query occurs in the annotation's URI", () => {
      const annotation = {
        id: 1,
        uri: 'https://publisher.org/article',
      };
      const filters = { uri: { terms: ['publisher'], operator: 'or' } };

      const result = viewFilter.filter([annotation], filters);

      assert.deepEqual(result, [1]);
    });
  });

  describe('"since" field', () => {
    it('matches if the annotation is newer than the query', () => {
      const annotation = {
        id: 1,
        updated: isoDateWithAge(50),
      };
      const filters = {
        since: { terms: [100], operator: 'and' },
      };

      const result = viewFilter.filter([annotation], filters);

      assert.deepEqual(result, [1]);
    });

    it('does not match if the annotation is older than the query', () => {
      const annotation = {
        id: 1,
        updated: isoDateWithAge(150),
      };
      const filters = {
        since: { terms: [100], operator: 'and' },
      };

      const result = viewFilter.filter([annotation], filters);

      assert.deepEqual(result, []);
    });
  });

  it('ignores filters with no terms in the query', () => {
    const annotation = { id: 1, tags: ['foo'] };
    const filters = {
      any: {
        terms: ['foo'],
        operator: 'and',
      },
      tag: {
        terms: [],
        operator: 'and',
      },
    };

    const result = viewFilter.filter([annotation], filters);

    assert.deepEqual(result, [1]);
  });
});
