import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import AnnotationShareControl from '../annotation-share-control';
import { $imports } from '../annotation-share-control';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationShareControl', () => {
  let fakeAnnotation;
  let fakeAnalytics;
  let fakeCopyToClipboard;
  let fakeToastMessenger;
  let fakeGroup;
  let fakeIsPrivate;
  let fakeShareUri;

  let container;

  const getButton = (wrapper, iconName) => {
    return wrapper.find('Button').filter({ icon: iconName });
  };

  function createComponent(props = {}) {
    return mount(
      <AnnotationShareControl
        annotation={fakeAnnotation}
        analytics={fakeAnalytics}
        toastMessenger={fakeToastMessenger}
        group={fakeGroup}
        shareUri={fakeShareUri}
        {...props}
      />,
      { attachTo: container }
    );
  }

  function openElement(wrapper) {
    act(() => {
      wrapper
        .find('Button')
        .props()
        .onClick();
    });
    wrapper.update();
  }

  beforeEach(() => {
    // This extra element is necessary to test automatic `focus`-ing
    // of the component's `input` element
    container = document.createElement('div');
    document.body.appendChild(container);

    fakeAnnotation = {
      group: 'fakegroup',
      permissions: {},
      user: 'acct:bar@foo.com',
    };

    fakeAnalytics = {
      events: {
        ANNOTATION_SHARED: 'whatever',
      },
    };
    fakeCopyToClipboard = {
      copyText: sinon.stub(),
    };
    fakeToastMessenger = {
      success: sinon.stub(),
      error: sinon.stub(),
    };
    fakeGroup = {
      name: 'My Group',
      type: 'private',
    };
    fakeIsPrivate = sinon.stub().returns(false);
    fakeShareUri = 'https://www.example.com';

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/copy-to-clipboard': fakeCopyToClipboard,
      '../util/permissions': { isPrivate: fakeIsPrivate },
      './hooks/use-element-should-close': sinon.stub(),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render component if `group` prop not OK', () => {
    const wrapper = createComponent({ group: undefined });
    assert.equal(wrapper.html(), '');
  });

  it('does not render content when not open', () => {
    const wrapper = createComponent();

    // Component is not `open` initially
    assert.isFalse(wrapper.find('.annotation-share-panel').exists());
  });

  it('toggles the share control element when the button is clicked', () => {
    const wrapper = createComponent();
    const button = getButton(wrapper, 'share');

    act(() => {
      button.props().onClick();
    });
    wrapper.update();

    assert.isTrue(wrapper.find('.annotation-share-panel').exists());
  });

  it('renders the share URI in a readonly input field', () => {
    const wrapper = createComponent();
    openElement(wrapper);

    const inputEl = wrapper.find('input');
    assert.equal(inputEl.prop('value'), fakeShareUri);
    assert.isTrue(inputEl.prop('readOnly'));
  });

  describe('copying the share URI to the clipboard', () => {
    it('copies the share link to the clipboard when the copy button is clicked', () => {
      const wrapper = createComponent();
      openElement(wrapper);

      getButton(wrapper, 'copy')
        .props()
        .onClick();

      assert.calledWith(
        fakeCopyToClipboard.copyText,
        'https://www.example.com'
      );
    });

    it('confirms link copy when successful', () => {
      const wrapper = createComponent();
      openElement(wrapper);

      getButton(wrapper, 'copy')
        .props()
        .onClick();

      assert.calledWith(
        fakeToastMessenger.success,
        'Copied share link to clipboard'
      );
    });

    it('flashes an error if link copying unsuccessful', () => {
      fakeCopyToClipboard.copyText.throws();
      const wrapper = createComponent();
      openElement(wrapper);

      getButton(wrapper, 'copy')
        .props()
        .onClick();

      assert.calledWith(fakeToastMessenger.error, 'Unable to copy link');
    });
  });

  [
    {
      groupType: 'private',
      isPrivate: false,
      expected: 'Only members of the group My Group may view this annotation.',
    },
    {
      groupType: 'open',
      isPrivate: false,
      expected: 'Anyone using this link may view this annotation.',
    },
    {
      groupType: 'private',
      isPrivate: true,
      expected: 'Only you may view this annotation.',
    },
    {
      groupType: 'open',
      isPrivate: true,
      expected: 'Only you may view this annotation.',
    },
  ].forEach(testcase => {
    it(`renders the correct sharing information for a ${testcase.groupType} group when annotation privacy is ${testcase.isPrivate}`, () => {
      fakeIsPrivate.returns(testcase.isPrivate);
      fakeGroup.type = testcase.groupType;
      const wrapper = createComponent({ isPrivate: testcase.isPrivate });
      openElement(wrapper);

      const permissionsEl = wrapper.find(
        '.annotation-share-panel__permissions'
      );
      assert.equal(permissionsEl.text(), testcase.expected);
    });
  });

  it('focuses the share-URI input when opened', () => {
    document.body.focus();

    const wrapper = createComponent();
    openElement(wrapper);
    wrapper.update();

    assert.equal(
      document.activeElement.getAttribute('aria-label'),
      'Use this URL to share this annotation'
    );
  });

  it(
    'should pass a11y checks',
    checkAccessibility(
      {
        name: 'when closed',
        content: () => createComponent(),
      },
      {
        name: 'when open',
        content: () => {
          const wrapper = createComponent();
          openElement(wrapper);
          wrapper.update();
          return wrapper;
        },
      }
    )
  );
});
