import { Tab } from '@hypothesis/frontend-shared';
import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import HelpPanel, { $imports } from '../HelpPanel';

describe('HelpPanel', () => {
  let fakeSessionService;
  let fakeStore;
  let frames;

  let FakeVersionData;
  let fakeVersionData;

  function createComponent(props) {
    return mount(<HelpPanel session={fakeSessionService} {...props} />);
  }

  beforeEach(() => {
    frames = [];
    fakeSessionService = { dismissSidebarTutorial: sinon.stub() };
    fakeStore = {
      frames: () => frames,
      mainFrame: () => frames.find(f => !f.id) ?? null,
      profile: sinon.stub().returns({
        preferences: {
          show_sidebar_tutorial: true,
        },
        userid: 'acct:delores@hypothes.is',
        user_info: {
          display_name: 'Delores',
        },
      }),
    };
    fakeVersionData = {
      asEncodedURLString: sinon.stub().returns('fakeURLString'),
    };
    FakeVersionData = sinon.stub().returns(fakeVersionData);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../helpers/version-data': { VersionData: FakeVersionData },
    });
    $imports.$restore({
      // Rendering TabHeader and TabPanel is needed for a11y tests
      './tabs/TabHeader': true,
      './tabs/TabPanel': true,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const getActivePanel = wrapper => wrapper.find('TabPanel[active=true]');
  const clickTab = (wrapper, tabId) =>
    wrapper.find(`button[data-testid="${tabId}"]`).simulate('click');

  context('when viewing tutorial sub-panel', () => {
    it('should show tutorial by default', () => {
      const wrapper = createComponent();
      const selectedTab = wrapper
        .find(Tab)
        .findWhere(tab => tab.prop('selected'));
      const activePanel = getActivePanel(wrapper);

      assert.include(selectedTab.text(), 'Help');
      assert.isTrue(activePanel.find('Tutorial').exists());
      assert.isFalse(activePanel.find('VersionInfo').exists());
    });

    it('should switch to versionInfo sub-panel when second tab is clicked', async () => {
      const wrapper = createComponent();
      clickTab(wrapper, 'version-info-tab');

      const activePanel = getActivePanel(wrapper);

      assert.isTrue(activePanel.find('VersionInfo').exists());
      assert.equal(
        activePanel.find('VersionInfo').prop('versionData'),
        fakeVersionData,
      );
      assert.isFalse(activePanel.find('Tutorial').exists());
    });
  });

  context('when viewing versionInfo sub-panel', () => {
    it('provides info about the current user', () => {
      createComponent();

      const userInfo = FakeVersionData.getCall(0).args[0];
      assert.deepEqual(userInfo, {
        userid: 'acct:delores@hypothes.is',
        displayName: 'Delores',
      });
    });

    it('shows document info for current frames', () => {
      // Unsorted frames
      frames = [
        {
          id: 'subframe',
          uri: 'https://example.com/child-frame',
        },
        {
          id: null,
          uri: 'https://example.com/',
        },
        {
          id: 'subframe2',
          uri: 'https://example.com/child-frame-2',
        },
      ];

      createComponent();

      assert.calledOnce(FakeVersionData);
      const docInfo = FakeVersionData.getCall(0).args[1];

      // Frames should be passed to `VersionData` with the main frame first.
      assert.deepEqual(docInfo, [
        {
          id: null,
          uri: 'https://example.com/',
        },
        {
          id: 'subframe',
          uri: 'https://example.com/child-frame',
        },
        {
          id: 'subframe2',
          uri: 'https://example.com/child-frame-2',
        },
      ]);
    });

    it('should switch to tutorial sub-panel when first tab is clicked', () => {
      const wrapper = createComponent();

      // Click to get to VersionInfo sub-panel...
      clickTab(wrapper, 'version-info-tab');
      // Click again to get back to tutorial sub-panel
      clickTab(wrapper, 'tutorial-tab');

      const activePanel = getActivePanel(wrapper);

      assert.isFalse(activePanel.find('VersionInfo').exists());
      assert.isTrue(activePanel.find('Tutorial').exists());
    });
  });

  describe('`HelpPanelTab`s', () => {
    it('should render static link to knowledge base', () => {
      const wrapper = createComponent();

      assert.isTrue(
        wrapper
          .find('HelpPanelTab')
          .filter({ linkText: 'Help topics' })
          .exists(),
      );
    });

    it('should render dynamic link to create a new help ticket', () => {
      const wrapper = createComponent();
      const helpTab = wrapper
        .find('HelpPanelTab')
        .filter({ linkText: 'New support ticket' });
      assert.isTrue(helpTab.exists());
      assert.include(helpTab.prop('url'), 'fakeURLString');
    });
  });

  context('dismissing the tutorial and clearing profile setting', () => {
    context('profile preference to auto-show tutorial is truthy', () => {
      beforeEach(() => {
        fakeStore.profile.returns({
          preferences: { show_sidebar_tutorial: true },
        });
      });

      it('should not dismiss the panel when it is initially opened', () => {
        const wrapper = createComponent();
        const onActiveChanged = wrapper
          .find('SidebarPanel')
          .prop('onActiveChanged');

        act(() => {
          // "Activate" the panel (simulate the `SidebarPanel` communicating
          // an active state via callback prop)
          onActiveChanged(true);
        });

        assert.notOk(fakeSessionService.dismissSidebarTutorial.callCount);
      });

      it('should invoke dismiss service method when panel is first closed', () => {
        const wrapper = createComponent();
        const onActiveChanged = wrapper
          .find('SidebarPanel')
          .prop('onActiveChanged');

        act(() => {
          // "Activate" the panel (simulate the `SidebarPanel` communicating
          // an active state via callback prop)
          onActiveChanged(true);
          // Now "close" the panel
          onActiveChanged(false);
        });

        assert.calledOnce(fakeSessionService.dismissSidebarTutorial);
      });
    });

    context('profile preference to auto-show tutorial is falsy', () => {
      beforeEach(() => {
        fakeStore.profile.returns({
          preferences: { show_sidebar_tutorial: false },
        });
      });

      it('should not invoke dismiss service method when panel is closed', () => {
        const wrapper = createComponent();
        const onActiveChanged = wrapper
          .find('SidebarPanel')
          .prop('onActiveChanged');

        act(() => {
          // "Activate" the panel (simulate the `SidebarPanel` communicating
          // an active state via callback prop)
          onActiveChanged(true);
          // Now "close" the panel
          onActiveChanged(false);
        });

        assert.notOk(fakeSessionService.dismissSidebarTutorial.callCount);
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => <HelpPanel session={fakeSessionService} />,
    }),
  );
});
