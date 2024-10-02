import { formatSortableDateTime } from '../time';

describe('formatSortableDateTime', () => {
  [
    new Date(Date.UTC(2023, 11, 20, 3, 5, 38)),
    new Date('2020-05-04T23:02:01+05:00'),
  ].forEach(date => {
    it('returns right format for provided date', () => {
      const expectedDateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      assert.match(formatSortableDateTime(date), expectedDateRegex);
    });
  });
});
