import * as fixtures from '../../test/annotation-fixtures';
import * as tabs from '../tabs';

describe('sidebar/helpers/tabs', () => {
  describe('tabForAnnotation', () => {
    [
      {
        ann: fixtures.defaultAnnotation(),
        expectedTab: 'annotation',
      },
      {
        ann: fixtures.oldPageNote(),
        expectedTab: 'note',
      },
      {
        ann: Object.assign(fixtures.defaultAnnotation(), { $orphan: true }),
        expectedTab: 'orphan',
      },
    ].forEach(testCase => {
      it(`shows annotation in correct tab (${testCase.expectedTab})`, () => {
        const ann = testCase.ann;
        const expectedTab = testCase.expectedTab;
        assert.equal(tabs.tabForAnnotation(ann), expectedTab);
      });
    });
  });
});
