import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import HelpPanel from '../HelpPanel';
import { $imports } from '../HelpPanel';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('HelpPanel', () => {
  let fakeAuth;
  let fakeSessionService;
  let fakeStore;
  let frames;

  let FakeVersionData;
  let fakeVersionData;

  function createComponent(props) {
    return mount(
      <HelpPanel auth={fakeAuth} session={fakeSessionService} {...props} />
    );
  }

  beforeEach(() => {
    frames = [];
    fakeAuth = {};
    fakeSessionService = { dismissSidebarTutorial: sinon.stub() };
    fakeStore = {
      frames: () => frames,
      mainFrame: () => frames.find(f => !f.id) ?? null,
      profile: sinon.stub().returns({
        preferences: { show_sidebar_tutorial: true },
      }),
    };
    fakeVersionData = {
      asEncodedURLString: sinon.stub().returns('fakeURLString'),
    };
    FakeVersionData = sinon.stub().returns(fakeVersionData);

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
      '../helpers/version-data': FakeVersionData,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('when viewing tutorial sub-panel', () => {
    it('should show tutorial by default', () => {
      const wrapper = createComponent();
      const subHeader = wrapper.find('.HelpPanel__sub-panel-title');

      assert.include(subHeader.text(), 'Getting started');
      assert.isTrue(wrapper.find('Tutorial').exists());
      assert.isFalse(wrapper.find('VersionInfo').exists());
    });

    it('should show navigation link to versionInfo sub-panel', () => {
      const wrapper = createComponent();
      const link = wrapper.find('.HelpPanel__sub-panel-navigation-button');

      assert.include(link.text(), 'About this version');
    });

    it('should switch to versionInfo sub-panel when footer link clicked', () => {
      const wrapper = createComponent();
      wrapper.find('.HelpPanel__sub-panel-navigation-button').simulate('click');

      assert.include(
        wrapper.find('.HelpPanel__sub-panel-title').text(),
        'About this version'
      );
      assert.isTrue(wrapper.find('VersionInfo').exists());
      assert.equal(
        wrapper.find('VersionInfo').prop('versionData'),
        fakeVersionData
      );
      assert.isFalse(wrapper.find('Tutorial').exists());
    });
  });

  context('when viewing versionInfo sub-panel', () => {
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

    it('should show navigation link back to tutorial sub-panel', () => {
      const wrapper = createComponent();
      wrapper.find('.HelpPanel__sub-panel-navigation-button').simulate('click');

      const link = wrapper.find('.HelpPanel__sub-panel-navigation-button');

      assert.isTrue(wrapper.find('VersionInfo').exists());
      assert.isFalse(wrapper.find('Tutorial').exists());
      assert.include(link.text(), 'Getting started');
    });

    it('should switch to tutorial sub-panel when link clicked', () => {
      const wrapper = createComponent();

      // Click to get to VersionInfo sub-panel...
      wrapper.find('.HelpPanel__sub-panel-navigation-button').simulate('click');

      const link = wrapper.find('.HelpPanel__sub-panel-navigation-button');
      // Click again to get back to tutorial sub-panel
      link.simulate('click');

      assert.isFalse(wrapper.find('VersionInfo').exists());
      assert.isTrue(wrapper.find('Tutorial').exists());
    });
  });

  describe('`HelpPanelTab`s', () => {
    it('should render static link to knowledge base', () => {
      const wrapper = createComponent();

      assert.isTrue(
        wrapper
          .find('HelpPanelTab')
          .filter({ linkText: 'Help topics' })
          .exists()
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
      content: () => createComponent(),
    })
  );
});
