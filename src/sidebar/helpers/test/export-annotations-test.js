import { suggestedFilename } from '../export-annotations';

describe('suggestedFilename', () => {
  [
    // Date only
    {
      date: new Date(2023, 5, 23),
      expectedResult: '2023-06-23-Hypothesis',
    },
    {
      date: new Date(2019, 0, 5),
      expectedResult: '2019-01-05-Hypothesis',
    },
    // Date and group name only
    {
      date: new Date(2020, 10, 5),
      groupName: 'My group name',
      expectedResult: '2020-11-05-Hypothesis-My-group-name',
    },
    {
      date: new Date(2020, 10, 5),
      groupName: 'My group name',
      documentMetadata: {
        title: '', // There is a title, but it is empty
      },
      expectedResult: '2020-11-05-Hypothesis-My-group-name',
    },
    // Date, group name and non-empty title
    {
      date: new Date(2020, 10, 5),
      groupName: 'My group name',
      documentMetadata: {
        title: 'Example domain',
      },
      expectedResult: '2020-11-05-Example domain-My-group-name',
    },
    // Long title
    {
      date: new Date(2020, 10, 5),
      groupName: 'My group name',
      documentMetadata: {
        title: 'a'.repeat(60),
      },
      expectedResult: `2020-11-05-${'a'.repeat(50)}-My-group-name`,
    },
  ].forEach(({ date, documentMetadata, groupName, expectedResult }) => {
    it('builds expected filename for provided arguments', () => {
      assert.equal(
        suggestedFilename({ date, documentMetadata, groupName }),
        expectedResult,
      );
    });
  });

  it('defaults to current date', () => {
    const result = suggestedFilename({});
    const dateStr = new Date().toISOString().slice(0, 10);
    assert.equal(result, `${dateStr}-Hypothesis`);
  });
});
