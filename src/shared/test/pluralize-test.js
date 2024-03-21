import { pluralize } from '../pluralize';

describe('pluralize', () => {
  [
    { count: 0, expectedResult: 'people' },
    { count: 1, expectedResult: 'person' },
    { count: 2, expectedResult: 'people' },
    { count: 10, expectedResult: 'people' },
  ].forEach(({ count, expectedResult }) => {
    it('returns expected form', () => {
      assert.equal(pluralize(count, 'person', 'people'), expectedResult);
    });
  });
});
