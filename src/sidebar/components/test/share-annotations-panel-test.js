import { mount } from 'enzyme';
import { createElement } from 'preact';

import ShareAnnotationsPanel from '../share-annotations-panel';
import { $imports } from '../share-annotations-panel';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('ShareAnnotationsPanel', () => {
  let fakeStore;
  let fakeAnalytics;
  let fakeToastMessenger;
  let fakeCopyToClipboard;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createShareAnnotationsPanel = props =>
    mount(
      <ShareAnnotationsPanel
        analytics={fakeAnalytics}
        toastMessenger={fakeToastMessenger}
        {...props}
      />
    );

  beforeEach(() => {
    fakeAnalytics = {
      events: {
        DOCUMENT_SHARED: 'whatever',
      },
      track: sinon.stub(),
    };
    fakeCopyToClipboard = {
      copyText: sinon.stub(),
    };
    fakeToastMessenger = {
      success: sinon.stub(),
      error: sinon.stub(),
    };

    fakeStore = {
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      mainFrame: () => ({
        uri: 'https://www.example.com',
      }),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
      '../util/copy-to-clipboard': fakeCopyToClipboard,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('panel title', () => {
    it("sets sidebar panel title to include group's name", () => {
      const wrapper = createShareAnnotationsPanel();

      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in Test Private Group'
      );
    });

    it('sets a temporary title if focused group not available', () => {
      fakeStore.focusedGroup = sinon.stub().returns({});

      const wrapper = createShareAnnotationsPanel();
      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in ...'
      );
    });
  });

  describe('panel content', () => {
    it('renders panel content if needed info available', () => {
      const wrapper = createShareAnnotationsPanel();
      assert.isTrue(wrapper.exists('.share-annotations-panel'));
    });

    it('does not render panel content if needed info not available', () => {
      fakeStore.focusedGroup.returns(undefined);

      const wrapper = createShareAnnotationsPanel();
      assert.isFalse(wrapper.exists('.share-annotations-panel'));
    });
  });

  [
    {
      groupType: 'private',
      introPattern: /Use this link.*with other group members/,
      visibilityPattern: /Annotations in the private group.*are only visible to group members/,
    },
    {
      groupType: 'restricted',
      introPattern: /Use this link to share these annotations with anyone/,
      visibilityPattern: /Anyone using this link may view the annotations in the group/,
    },
    {
      groupType: 'open',
      introPattern: /Use this link to share these annotations with anyone/,
      visibilityPattern: /Anyone using this link may view the annotations in the group/,
    },
  ].forEach(testCase => {
    it('it displays appropriate help text depending on group type', () => {
      fakeStore.focusedGroup.returns({
        type: testCase.groupType,
        name: 'Test Group',
        id: 'testid,',
      });

      const wrapper = createShareAnnotationsPanel();

      assert.match(
        wrapper.find('.share-annotations-panel__intro').text(),
        testCase.introPattern
      );

      assert.match(
        wrapper.find('.share-annotations-panel').text(),
        testCase.visibilityPattern
      );
    });
  });

  describe('web share link', () => {
    it('displays web share link in readonly form input', () => {
      const wrapper = createShareAnnotationsPanel();

      const inputEl = wrapper.find('input');
      assert.equal(
        inputEl.prop('value'),
        'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate'
      );
      assert.equal(inputEl.prop('readOnly'), true);
    });

    describe('copy link to clipboard', () => {
      it('copies link to clipboard when copy button clicked', () => {
        const wrapper = createShareAnnotationsPanel();

        wrapper
          .find('Button')
          .props()
          .onClick();

        assert.calledWith(
          fakeCopyToClipboard.copyText,
          'https://hyp.is/go?url=https%3A%2F%2Fwww.example.com&group=testprivate'
        );
      });

      it('confirms link copy when successful', () => {
        const wrapper = createShareAnnotationsPanel();

        wrapper
          .find('Button')
          .props()
          .onClick();

        assert.calledWith(
          fakeToastMessenger.success,
          'Copied share link to clipboard'
        );
      });
      it('flashes an error if link copying unsuccessful', () => {
        fakeCopyToClipboard.copyText.throws();
        const wrapper = createShareAnnotationsPanel();

        wrapper
          .find('Button')
          .props()
          .onClick();

        assert.calledWith(fakeToastMessenger.error, 'Unable to copy link');
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createShareAnnotationsPanel(),
    })
  );
});
