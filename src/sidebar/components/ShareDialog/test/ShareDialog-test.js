import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import ShareDialog from '../ShareDialog';
import { $imports } from '../ShareDialog';

describe('ShareDialog', () => {
  let fakeStore;
  let fakeBouncerLink;
  let fakePageSharingLink;
  let fakeToastMessenger;
  let fakeCopyToClipboard;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createComponent = props =>
    mount(<ShareDialog toastMessenger={fakeToastMessenger} {...props} />);

  beforeEach(() => {
    fakeBouncerLink = 'http://hyp.is/go?url=http%3A%2F%2Fwww.example.com';
    fakeCopyToClipboard = {
      copyText: sinon.stub(),
    };

    fakePageSharingLink = sinon.stub().returns(fakeBouncerLink);
    fakeToastMessenger = {
      success: sinon.stub(),
      error: sinon.stub(),
    };

    fakeStore = {
      allAnnotations: sinon.stub().returns(0),
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      isLoading: sinon.stub().returns(false),
      isFeatureEnabled: sinon.stub().returns(false),
      mainFrame: () => ({
        uri: 'https://www.example.com',
      }),
    };

    $imports.$mock(mockImportedComponents());
    // Don't mock this very simple component
    $imports.$restore({ './LoadingSpinner': true });
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
      '../../helpers/annotation-sharing': {
        pageSharingLink: fakePageSharingLink,
      },
      '../../util/copy-to-clipboard': fakeCopyToClipboard,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('panel dialog title', () => {
    it("sets sidebar panel dialog title to include group's name", () => {
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in Test Private Group'
      );
    });

    it('sets a temporary title if focused group not available', () => {
      fakeStore.focusedGroup = sinon.stub().returns({});

      const wrapper = createComponent();
      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in ...'
      );
    });
  });

  describe('share panel content', () => {
    it('renders a spinner if focused group not available yet', () => {
      fakeStore.focusedGroup.returns(undefined);

      const wrapper = createComponent();
      assert.isTrue(wrapper.find('Spinner').exists());
    });

    it('renders panel content if needed info available', () => {
      const wrapper = createComponent();
      assert.isFalse(wrapper.find('Spinner').exists());
    });
  });

  [
    {
      groupType: 'private',
      introPattern: /Use this link.*with other group members/,
      visibilityPattern:
        /Annotations in the private group.*are only visible to group members/,
    },
    {
      groupType: 'restricted',
      introPattern: /Use this link to share these annotations with anyone/,
      visibilityPattern:
        /Anyone using this link may view the annotations in the group/,
    },
    {
      groupType: 'open',
      introPattern: /Use this link to share these annotations with anyone/,
      visibilityPattern:
        /Anyone using this link may view the annotations in the group/,
    },
  ].forEach(testCase => {
    it('it displays appropriate help text depending on group type', () => {
      fakeStore.focusedGroup.returns({
        type: testCase.groupType,
        name: 'Test Group',
        id: 'testid,',
      });

      const wrapper = createComponent();

      assert.match(
        wrapper.find('[data-testid="sharing-intro"]').text(),
        testCase.introPattern
      );

      assert.match(
        wrapper.find('[data-testid="sharing-details"]').text(),
        testCase.visibilityPattern
      );
    });

    context('document URI cannot be shared', () => {
      it('renders explanatory text about inability to share', () => {
        fakePageSharingLink.returns(null);

        const wrapper = createComponent();

        const panelEl = wrapper.find('[data-testid="no-sharing"]');
        assert.include(panelEl.text(), 'These annotations cannot be shared');
      });
    });
  });

  describe('web share link', () => {
    it('displays web share link in readonly form input', () => {
      const wrapper = createComponent();

      const inputEl = wrapper.find('input');
      assert.equal(inputEl.prop('value'), fakeBouncerLink);
      assert.equal(inputEl.prop('readOnly'), true);
    });

    context('document URI cannot be shared', () => {
      it('does not render an input field with share link', () => {
        fakePageSharingLink.returns(null);
        const wrapper = createComponent();

        const inputEl = wrapper.find('input');
        assert.isFalse(inputEl.exists());
      });
    });

    describe('copy link to clipboard', () => {
      it('copies link to clipboard when copy button clicked', () => {
        const wrapper = createComponent();

        wrapper.find('IconButton').props().onClick();

        assert.calledWith(fakeCopyToClipboard.copyText, fakeBouncerLink);
      });

      it('confirms link copy when successful', () => {
        const wrapper = createComponent();

        wrapper.find('IconButton').props().onClick();

        assert.calledWith(
          fakeToastMessenger.success,
          'Copied share link to clipboard'
        );
      });

      it('flashes an error if link copying unsuccessful', () => {
        fakeCopyToClipboard.copyText.throws();
        const wrapper = createComponent();

        wrapper.find('IconButton').props().onClick();

        assert.calledWith(fakeToastMessenger.error, 'Unable to copy link');
      });
    });
  });

  describe('tabbed dialog panel', () => {
    it('does not render a tabbed dialog if export feature flag is not enabled', () => {
      const wrapper = createComponent();

      assert.isFalse(wrapper.find('TabHeader').exists());
    });

    context('export feature enabled', () => {
      beforeEach(() => {
        fakeStore.isFeatureEnabled.withArgs('export_annotations').returns(true);
      });

      it('renders a tabbed dialog with share panel active', () => {
        const wrapper = createComponent();

        assert.isTrue(wrapper.find('TabHeader').exists());
        assert.isTrue(
          wrapper.find('Tab[aria-controls="share-panel"]').props().selected
        );
        assert.isTrue(
          wrapper.find('TabPanel[id="share-panel"]').props().active
        );
      });

      it('shows the export tab panel when export tab clicked', () => {
        const wrapper = createComponent();
        const shareTabSelector = 'Tab[aria-controls="share-panel"]';
        const exportTabSelector = 'Tab[aria-controls="export-panel"]';

        act(() => {
          wrapper
            .find(exportTabSelector)
            .getDOMNode()
            .dispatchEvent(new Event('click'));
        });
        wrapper.update();

        const selectedTab = wrapper.find('Tab').filter({ selected: true });
        assert.equal(selectedTab.text(), 'Export');
        assert.equal(selectedTab.props()['aria-controls'], 'export-panel');

        const activeTabPanel = wrapper
          .find('TabPanel')
          .filter({ active: true });
        assert.equal(activeTabPanel.props().id, 'export-panel');
        assert.isTrue(activeTabPanel.find('Input').exists());

        // Now, reselect share tab
        act(() => {
          wrapper
            .find(shareTabSelector)
            .getDOMNode()
            .dispatchEvent(new Event('click'));
        });
        wrapper.update();

        const shareTabPanel = wrapper.find('TabPanel').filter({ active: true });
        assert.equal(shareTabPanel.props().id, 'share-panel');
      });

      it('shows a loading indicator on the export tab if not ready', () => {
        const wrapper = createComponent();
        const exportTabSelector = 'Tab[aria-controls="export-panel"]';
        fakeStore.isLoading.returns(true);

        act(() => {
          wrapper
            .find(exportTabSelector)
            .getDOMNode()
            .dispatchEvent(new Event('click'));
        });
        wrapper.update();

        const activeTabPanel = wrapper
          .find('TabPanel')
          .filter({ active: true });
        assert.equal(activeTabPanel.props().id, 'export-panel');
        assert.isFalse(activeTabPanel.find('Input').exists());
        assert.isTrue(
          activeTabPanel.find('[data-testid="loading-spinner"]').exists()
        );
      });
    });
  });

  // TODO: Add a11y test for tabbed interface
  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});
