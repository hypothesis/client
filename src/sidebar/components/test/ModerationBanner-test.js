import {
  checkAccessibility,
  mockImportedComponents,
  waitFor,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import * as fixtures from '../../test/annotation-fixtures';
import ModerationBanner, { $imports } from '../ModerationBanner';

const moderatedAnnotation = fixtures.moderatedAnnotation;

describe('ModerationBanner', () => {
  let fakeApi;
  let fakeToastMessenger;

  function createComponent(props) {
    return mount(
      <ModerationBanner
        api={fakeApi}
        toastMessenger={fakeToastMessenger}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeToastMessenger = {
      error: sinon.stub(),
    };

    fakeApi = {
      annotation: {
        hide: sinon.stub().returns(Promise.resolve()),
        unhide: sinon.stub().returns(Promise.resolve()),
      },
    };

    const fakeStore = {
      hideAnnotation: sinon.stub(),
      unhideAnnotation: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  [
    {
      // Not hidden or flagged and user is not a moderator
      test: 'not hidden or flagged and user is not a moderator',
      ann: fixtures.defaultAnnotation(),
      expectVisible: false,
    },
    {
      test: 'hidden, but user is not a moderator',
      ann: {
        ...fixtures.defaultAnnotation(),
        hidden: true,
      },
      expectVisible: false,
    },
    {
      test: 'not hidden or flagged and user is a moderator',
      ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: false }),
      expectVisible: false,
    },
    {
      test: 'flagged but not hidden and the user is a moderator',
      ann: fixtures.moderatedAnnotation({ flagCount: 1, hidden: false }),
      expectVisible: true,
    },
    {
      // The client only allows moderators to hide flagged annotations but
      // an unflagged annotation can still be hidden via the API.
      test: 'hidden but not flagged and the user is a moderator',
      ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: true }),
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

  it('hides the annotation if "Hide" is clicked', () => {
    const wrapper = createComponent({
      annotation: fixtures.moderatedAnnotation({
        flagCount: 10,
      }),
    });
    wrapper.find('button').simulate('click');
    assert.calledWith(fakeApi.annotation.hide, { id: 'ann-id' });
  });

  it('reports an error if hiding the annotation fails', async () => {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 10,
      }),
    });
    fakeApi.annotation.hide.returns(Promise.reject(new Error('Network Error')));
    wrapper.find('button').simulate('click');

    await waitFor(() =>
      fakeToastMessenger.error.calledWith('Failed to hide annotation'),
    );
  });

  it('unhides the annotation if "Unhide" is clicked', () => {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    wrapper.find('button').simulate('click');
    assert.calledWith(fakeApi.annotation.unhide, { id: 'ann-id' });
  });

  it('reports an error if unhiding the annotation fails', async () => {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    fakeApi.annotation.unhide.returns(
      Promise.reject(new Error('Network Error')),
    );
    wrapper.find('button').simulate('click');

    await waitFor(() =>
      fakeToastMessenger.error.calledWith('Failed to unhide annotation'),
    );
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
