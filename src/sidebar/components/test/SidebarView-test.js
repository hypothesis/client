import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import SidebarView, { $imports } from '../SidebarView';

describe('SidebarView', () => {
  let fakeFrameSync;
  let fakeLoadAnnotationsService;
  let fakeUseRootThread;
  let fakeStore;
  let fakeStreamer;
  let fakeTabsUtil;

  const createComponent = props =>
    mount(
      <SidebarView
        onLogin={() => null}
        onSignUp={() => null}
        frameSync={fakeFrameSync}
        loadAnnotationsService={fakeLoadAnnotationsService}
        streamer={fakeStreamer}
        {...props}
      />,
    );

  beforeEach(() => {
    fakeFrameSync = {
      hoverAnnotation: sinon.stub(),
      scrollToAnnotation: sinon.stub(),
    };
    fakeLoadAnnotationsService = {
      load: sinon.stub(),
    };
    fakeUseRootThread = sinon.stub().returns({
      rootThread: {
        children: [],
      },
      tabCounts: {
        annotation: 1,
        note: 2,
        orphan: 0,
      },
    });
    fakeStreamer = {
      connect: sinon.stub(),
    };
    fakeStore = {
      // actions
      clearSelection: sinon.stub(),
      selectTab: sinon.stub(),
      // selectors
      annotationExists: sinon.stub(),
      directLinkedAnnotationId: sinon.stub(),
      directLinkedGroupFetchFailed: sinon.stub(),
      filteredGroupIDs: sinon.stub().returns([]),
      findAnnotationByID: sinon.stub(),
      focusedGroupId: sinon.stub(),
      focusState: sinon.stub().returns({ active: false }),
      hasAppliedFilter: sinon.stub(),
      hasFetchedAnnotations: sinon.stub(),
      hasFetchedProfile: sinon.stub().returns(true),
      hasSelectedAnnotations: sinon.stub(),
      hasSidebarOpened: sinon.stub(),
      isLoading: sinon.stub().returns(false),
      isLoggedIn: sinon.stub(),
      isSidebarPanelOpen: sinon.stub().returns(false),
      profile: sinon.stub().returns({ userid: null }),
      searchUris: sinon.stub().returns([]),
      toggleFocusMode: sinon.stub(),
    };

    fakeTabsUtil = {
      tabForAnnotation: sinon.stub().returns('annotation'),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': { useRootThread: fakeUseRootThread },
      '../store': { useSidebarStore: () => fakeStore },
      '../helpers/tabs': fakeTabsUtil,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('loading annotations', () => {
    let wrapper;
    beforeEach(() => {
      fakeStore.focusedGroupId.returns('47');
      fakeStore.searchUris.returns(['foobar']);
      fakeStore.profile.returns({ userid: 'somebody' });
      wrapper = createComponent();
      fakeLoadAnnotationsService.load.resetHistory();
    });

    it('loads annotations when userId changes', () => {
      fakeStore.profile.returns({ userid: 'somethingElse' });
      wrapper.setProps({});
      assert.calledOnce(fakeLoadAnnotationsService.load);
      assert.notCalled(fakeStore.clearSelection);
    });

    it('clears selected annotations and selections and loads annotations when groupId changes', () => {
      fakeStore.focusedGroupId.returns('affable');
      wrapper.setProps({});
      assert.calledOnce(fakeStore.focusState);
      assert.calledOnce(fakeLoadAnnotationsService.load);
      assert.calledOnce(fakeStore.clearSelection);
      assert.notCalled(fakeStore.toggleFocusMode);
    });

    it('restores focus mode after changing focused group', () => {
      fakeStore.focusedGroupId.returns('affable');
      fakeStore.focusState.returns({ active: true });

      wrapper.setProps({});

      assert.calledOnce(fakeStore.clearSelection);
      assert.calledWith(fakeStore.toggleFocusMode, { active: true });
    });

    it('does not clear selected annotations when group ID is first set on startup', () => {
      fakeStore.focusedGroupId.returns(null);
      wrapper = createComponent();
      fakeStore.focusedGroupId.returns('foobar');

      wrapper.setProps({});

      assert.notCalled(fakeStore.clearSelection);
    });

    it('loads annotations when searchURIs change', () => {
      fakeStore.searchUris.returns(['abandon-ship']);
      wrapper.setProps({});
      assert.calledOnce(fakeLoadAnnotationsService.load);
      assert.notCalled(fakeStore.clearSelection);
    });
  });

  context('when viewing a direct-linked annotation', () => {
    context('successful direct-linked annotation', () => {
      let fakeAnnotation;

      beforeEach(() => {
        fakeAnnotation = { $orphan: false, $tag: 'myTag' };
        fakeStore.isLoading.returns(false);
        fakeStore.annotationExists.withArgs('someId').returns(true);
        fakeStore.directLinkedAnnotationId.returns('someId');
        fakeStore.findAnnotationByID.withArgs('someId').returns(fakeAnnotation);
      });

      it('focuses and scrolls to direct-linked annotations once anchored', () => {
        createComponent();
        assert.calledOnce(fakeFrameSync.scrollToAnnotation);
        assert.calledWith(fakeFrameSync.scrollToAnnotation, fakeAnnotation);
        assert.calledOnce(fakeFrameSync.hoverAnnotation);
        assert.calledWith(fakeFrameSync.hoverAnnotation, fakeAnnotation);
      });

      it('selects the correct tab for direct-linked annotations once anchored', () => {
        createComponent();
        assert.calledOnce(fakeStore.selectTab);
        assert.calledWith(fakeStore.selectTab, 'annotation');
      });

      it('selects the correct tab for direct-linked orphaned annotations', () => {
        fakeStore.findAnnotationByID
          .withArgs('someId')
          .returns({ $orphan: true, $tag: 'myTag' });
        fakeTabsUtil.tabForAnnotation.returns('orphan');
        createComponent();
        assert.calledOnce(fakeStore.selectTab);
        assert.calledWith(fakeStore.selectTab, 'orphan');
      });

      it('renders a logged-out message CTA if user is not logged in', () => {
        fakeStore.isLoggedIn.returns(false);
        const wrapper = createComponent();
        assert.isTrue(wrapper.find('LoggedOutMessage').exists());
      });
    });

    context('error on direct-linked annotation', () => {
      beforeEach(() => {
        // This puts us into a "direct-linked annotation" state
        fakeStore.isLoading.returns(false);
        fakeStore.directLinkedAnnotationId.returns('someId');

        // This puts us into an error state
        fakeStore.findAnnotationByID.withArgs('someId').returns(undefined);
        fakeStore.annotationExists.withArgs('someId').returns(false);
      });

      it('renders a content error', () => {
        const wrapper = createComponent();

        assert.isTrue(
          wrapper
            .find('SidebarContentError')
            .filter({ errorType: 'annotation' })
            .exists(),
        );
      });

      it('does not render tabs', () => {
        const wrapper = createComponent();
        assert.isFalse(wrapper.find('SelectionTabs').exists());
      });

      it('does not render filter status', () => {
        const wrapper = createComponent();
        assert.isFalse(wrapper.find('FilterControls').exists());
      });
    });
  });

  context('error with direct-linked group', () => {
    beforeEach(() => {
      fakeStore.isLoading.returns(false);
      fakeStore.directLinkedGroupFetchFailed.returns(true);
    });

    it('renders a content error', () => {
      const wrapper = createComponent();

      assert.isTrue(
        wrapper
          .find('SidebarContentError')
          .filter({ errorType: 'group' })
          .exists(),
      );
    });

    it('does not render tabs', () => {
      const wrapper = createComponent();
      assert.isFalse(wrapper.find('SelectionTabs').exists());
    });

    it('does not render filter status', () => {
      const wrapper = createComponent();
      assert.isFalse(wrapper.find('FilterControls').exists());
    });
  });

  describe('filter controls', () => {
    [
      {
        searchPanelOpen: false,
        showControls: true,
      },
      {
        searchPanelOpen: true,
        showControls: false,
      },
    ].forEach(({ searchPanelOpen, showControls }) => {
      it(`renders filter controls when search panel is not open`, () => {
        fakeStore.isSidebarPanelOpen
          .withArgs('searchAnnotations')
          .returns(searchPanelOpen);

        const wrapper = createComponent();

        assert.equal(wrapper.exists('FilterControls'), showControls);
      });
    });
  });

  describe('streamer', () => {
    it('connects to streamer when sidebar is opened', () => {
      const wrapper = createComponent();
      fakeStreamer.connect.resetHistory();
      fakeStore.hasSidebarOpened.returns(true);
      wrapper.setProps({});
      assert.calledOnce(fakeStreamer.connect);
    });

    it('connects to streamer when user logs in', () => {
      const wrapper = createComponent();
      fakeStreamer.connect.resetHistory();
      fakeStore.isLoggedIn.returns(true);
      wrapper.setProps({});
      assert.calledOnce(fakeStreamer.connect);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
