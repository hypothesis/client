const { createElement } = require('preact');
const { mount } = require('enzyme');

const AnnotationActionBar = require('../annotation-action-bar');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationActionBar', () => {
  let fakeAnnotation;
  let fakeOnDelete;
  let fakeOnEdit;
  let fakeOnFlag;
  let fakeOnReply;
  // Fake services
  let fakeGroups;
  let fakePermissions;
  let fakeSession;
  let fakeSettings;
  // Fake dependencies
  let fakeIsShareable;

  function createComponent(props = {}) {
    return mount(
      <AnnotationActionBar
        annotation={fakeAnnotation}
        isPrivate={false}
        onDelete={fakeOnDelete}
        onEdit={fakeOnEdit}
        onReply={fakeOnReply}
        onFlag={fakeOnFlag}
        groups={fakeGroups}
        permissions={fakePermissions}
        session={fakeSession}
        settings={fakeSettings}
        {...props}
      />
    );
  }

  const allowOnly = action => {
    fakePermissions.permits.returns(false);
    fakePermissions.permits
      .withArgs(sinon.match.any, action, sinon.match.any)
      .returns(true);
  };

  const disallowOnly = action => {
    fakePermissions.permits
      .withArgs(sinon.match.any, action, sinon.match.any)
      .returns(false);
  };

  const getButton = (wrapper, iconName) => {
    return wrapper.find('Button').filter({ icon: iconName });
  };

  beforeEach(() => {
    fakeAnnotation = {
      group: 'fakegroup',
      permissions: {},
      user: 'acct:bar@foo.com',
    };
    fakeSession = {
      state: {
        userid: 'acct:foo@bar.com',
      },
    };

    fakeOnEdit = sinon.stub();
    fakeOnDelete = sinon.stub();
    fakeOnReply = sinon.stub();
    fakeOnFlag = sinon.stub();

    fakeGroups = {
      get: sinon.stub(),
    };

    fakePermissions = {
      permits: sinon.stub().returns(true),
    };
    fakeSettings = {};

    fakeIsShareable = sinon.stub().returns(true);

    AnnotationActionBar.$imports.$mock(mockImportedComponents());
    AnnotationActionBar.$imports.$mock({
      '../util/annotation-sharing': {
        isShareable: fakeIsShareable,
        shareURI: sinon.stub().returns('http://share.me'),
      },
    });
  });

  afterEach(() => {
    AnnotationActionBar.$imports.$restore();
  });

  describe('edit action button', () => {
    it('shows edit button if permissions allow', () => {
      allowOnly('update');
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'edit').exists());
    });

    it('invokes `onEdit` callback when edit button clicked', () => {
      allowOnly('update');
      const button = getButton(createComponent(), 'edit');

      button.props().onClick();

      assert.calledOnce(fakeOnEdit);
    });

    it('does not show edit button if permissions do not allow', () => {
      disallowOnly('update');

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'edit').exists());
    });
  });

  describe('delete action button', () => {
    it('shows delete button if permissions allow', () => {
      allowOnly('delete');
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'trash').exists());
    });

    it('invokes `onDelete` callback when delete button clicked', () => {
      allowOnly('delete');
      const button = getButton(createComponent(), 'trash');

      button.props().onClick();

      assert.calledOnce(fakeOnDelete);
    });

    it('does not show edit button if permissions do not allow', () => {
      disallowOnly('delete');

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'trash').exists());
    });
  });

  describe('reply action button', () => {
    it('shows the reply button (in all cases)', () => {
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'reply').exists());
    });

    it('invokes `onReply` callback when reply button clicked', () => {
      const button = getButton(createComponent(), 'reply');

      button.props().onClick();

      assert.calledOnce(fakeOnReply);
    });
  });

  describe('share action button', () => {
    it('shows share action button if annotation is shareable', () => {
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('AnnotationShareControl').exists());
    });

    it('does not show share action button if annotation is not shareable', () => {
      fakeIsShareable.returns(false);
      const wrapper = createComponent();

      assert.isFalse(wrapper.find('AnnotationShareControl').exists());
    });
  });

  describe('flag action button', () => {
    it('shows flag button if user is not author', () => {
      const wrapper = createComponent();

      assert.isTrue(getButton(wrapper, 'flag').exists());
    });

    it('invokes `onFlag` callback when flag button clicked', () => {
      const button = getButton(createComponent(), 'flag');

      button.props().onClick();

      assert.calledOnce(fakeOnFlag);
    });

    it('does not show flag action button if user is author', () => {
      fakeAnnotation.user = 'acct:foo@bar.com';

      const wrapper = createComponent();

      assert.isFalse(getButton(wrapper, 'flag').exists());
    });

    context('previously-flagged annotation', () => {
      beforeEach(() => {
        fakeAnnotation.flagged = true;
      });

      it('renders an active-state flag action button', () => {
        const wrapper = createComponent();

        assert.isTrue(getButton(wrapper, 'flag--active').exists());
      });

      it('does not set an `onClick` property for the flag action button', () => {
        const button = getButton(createComponent(), 'flag--active');

        assert.isUndefined(button.props().onClick);
      });
    });
  });
});
