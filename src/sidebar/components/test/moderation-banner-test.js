'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const ModerationBanner = require('../moderation-banner');
const fixtures = require('../../test/annotation-fixtures');
const unroll = require('../../../shared/test/util').unroll;

const moderatedAnnotation = fixtures.moderatedAnnotation;

describe('ModerationBanner', () => {
  let fakeApi;
  let fakeFlash;

  function createComponent(props) {
    return shallow(
      <ModerationBanner api={fakeApi} flash={fakeFlash} {...props} />
    ).dive(); // dive() needed because this component uses `withServices`
  }

  beforeEach(() => {
    fakeFlash = {
      error: sinon.stub(),
    };

    fakeApi = {
      annotation: {
        hide: sinon.stub().returns(Promise.resolve()),
        unhide: sinon.stub().returns(Promise.resolve()),
      },
    };

    ModerationBanner.$imports.$mock({
      '../store/use-store': callback =>
        callback({
          hide: sinon.stub(),
          unhide: sinon.stub(),
        }),
    });
  });

  afterEach(() => {
    ModerationBanner.$imports.$restore();
  });

  unroll(
    'displays if user is a moderator and annotation is hidden or flagged',
    function(testCase) {
      const wrapper = createComponent({
        annotation: testCase.ann,
      });
      if (testCase.expectVisible) {
        assert.notEqual(wrapper.text().trim(), '');
      } else {
        assert.isFalse(wrapper.exists());
      }
    },
    [
      {
        // Not hidden or flagged and user is not a moderator
        ann: fixtures.defaultAnnotation(),
        expectVisible: false,
      },
      {
        // Hidden, but user is not a moderator
        ann: {
          ...fixtures.defaultAnnotation(),
          hidden: true,
        },
        expectVisible: false,
      },
      {
        // Not hidden or flagged and user is a moderator
        ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: false }),
        expectVisible: false,
      },
      {
        // Flagged but not hidden
        ann: fixtures.moderatedAnnotation({ flagCount: 1, hidden: false }),
        expectVisible: true,
      },
      {
        // Hidden but not flagged. The client only allows moderators to hide flagged
        // annotations but an unflagged annotation can still be hidden via the API.
        ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: true }),
        expectVisible: true,
      },
    ]
  );

  it('displays the number of flags the annotation has received', function() {
    const ann = fixtures.moderatedAnnotation({ flagCount: 10 });
    const wrapper = createComponent({ annotation: ann });
    assert.include(wrapper.text(), 'Flagged for review x10');
  });

  it('displays in a more compact form if the annotation is a reply', function() {
    const wrapper = createComponent({
      annotation: {
        ...fixtures.oldReply(),
        moderation: {
          flagCount: 10,
        },
      },
    });
    wrapper.exists('.is-reply');
  });

  it('does not display in a more compact form if the annotation is not a reply', function() {
    const wrapper = createComponent({
      annotation: {
        ...fixtures.moderatedAnnotation({}),
        moderation: {
          flagCount: 10,
        },
      },
    });
    assert.isFalse(wrapper.exists('.is-reply'));
  });

  it('reports if the annotation was hidden', function() {
    const wrapper = createComponent({
      annotation: fixtures.moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    assert.include(wrapper.text(), 'Hidden from users');
  });

  it('hides the annotation if "Hide" is clicked', function() {
    const wrapper = createComponent({
      annotation: fixtures.moderatedAnnotation({
        flagCount: 10,
      }),
    });
    wrapper.find('button').simulate('click');
    assert.calledWith(fakeApi.annotation.hide, { id: 'ann-id' });
  });

  it('reports an error if hiding the annotation fails', function(done) {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 10,
      }),
    });
    fakeApi.annotation.hide.returns(Promise.reject(new Error('Network Error')));
    wrapper.find('button').simulate('click');

    setTimeout(function() {
      assert.calledWith(fakeFlash.error, 'Failed to hide annotation');
      done();
    }, 0);
  });

  it('unhides the annotation if "Unhide" is clicked', function() {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    wrapper.find('button').simulate('click');
    assert.calledWith(fakeApi.annotation.unhide, { id: 'ann-id' });
  });

  it('reports an error if unhiding the annotation fails', function(done) {
    const wrapper = createComponent({
      annotation: moderatedAnnotation({
        flagCount: 1,
        hidden: true,
      }),
    });
    fakeApi.annotation.unhide.returns(
      Promise.reject(new Error('Network Error'))
    );
    wrapper.find('button').simulate('click');
    setTimeout(function() {
      assert.calledWith(fakeFlash.error, 'Failed to unhide annotation');
      done();
    }, 0);
  });
});
