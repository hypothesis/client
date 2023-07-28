import { suggestedFilename } from '../export-annotations';

describe('suggestedFilename', () => {
  [
    {
      date: new Date(2023, 5, 23),
      expectedResult: '2023-06-23-Hypothesis',
    },
    {
      date: new Date(2019, 0, 5),
      expectedResult: '2019-01-05-Hypothesis',
    },
    {
      date: new Date(2020, 10, 5),
      groupName: 'My group name',
      expectedResult: '2020-11-05-Hypothesis-My-group-name',
    },
  ].forEach(({ date, groupName, expectedResult }) => {
    it('builds expected filename for provided arguments', () => {
      assert.equal(suggestedFilename({ date, groupName }), expectedResult);
    });
  });
});
