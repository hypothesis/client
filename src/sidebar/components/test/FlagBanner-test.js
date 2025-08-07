import {
  checkAccessibility,
  mockImportedComponents,
  mount,
} from '@hypothesis/frontend-testing';

import * as fixtures from '../../test/annotation-fixtures';
import FlagBanner, { $imports } from '../FlagBanner';

const moderatedAnnotation = fixtures.moderatedAnnotation;

describe('FlagBanner', () => {
  function createComponent(props) {
    return mount(<FlagBanner {...props} />);
  }

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  [
    {
      // Not flagged
      test: 'not flagged',
      ann: fixtures.defaultAnnotation(),
      expectVisible: false,
    },
    {
      test: 'flagged',
      ann: fixtures.moderatedAnnotation({ flagCount: 1 }),
      expectVisible: true,
    },
  ].forEach(testCase => {
    it(`displays if the annotation is ${testCase.test}`, () => {
      const wrapper = createComponent({
        annotation: testCase.ann,
      });
      if (testCase.expectVisible) {
        assert.notEqual(wrapper.text().trim(), '');
      } else {
        assert.equal(wrapper.text().trim(), '');
      }
    });
  });

  it('displays the number of flags the annotation has received', () => {
    const ann = fixtures.moderatedAnnotation({ flagCount: 10 });
    const wrapper = createComponent({ annotation: ann });
    assert.include(wrapper.text(), 'Flagged for review by 10 users');
  });

  it('reports if the annotation was hidden', () => {
    const wrapper = createComponent({
      annotation: fixtures.moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    assert.include(wrapper.text(), 'Hidden from users');
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () =>
        createComponent({
          annotation: moderatedAnnotation({
            flagCount: 10,
          }),
        }),
    }),
  );
});
