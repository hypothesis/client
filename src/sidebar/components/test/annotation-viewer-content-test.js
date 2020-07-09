import { createElement } from 'preact';
import { mount } from 'enzyme';

import { waitFor } from '../../../test-util/wait';
import mockImportedComponents from '../../../test-util/mock-imported-components';

import AnnotationViewerContent, {
  $imports,
} from '../annotation-viewer-content';

describe('AnnotationViewerContent', () => {
  let fakeStore;
  let fakeOnLogin;
  let fakeRootThreadService;
  let fakeLoadAnnotationsService;

  beforeEach(() => {
    fakeStore = {
      clearAnnotations: sinon.stub(),
      getState: sinon.stub().returns({}),
      highlightAnnotations: sinon.stub(),
      routeParams: sinon.stub().returns({ id: 'test_annotation_id' }),
      profile: sinon.stub().returns({ userid: null }),
      setCollapsed: sinon.stub(),
    };

    fakeLoadAnnotationsService = {
      loadThread: sinon.stub().resolves([]),
    };

    fakeOnLogin = sinon.stub();

    fakeRootThreadService = { thread: sinon.stub().returns({}) };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent(props = {}) {
    return mount(
      <AnnotationViewerContent
        loadAnnotationsService={fakeLoadAnnotationsService}
        onLogin={fakeOnLogin}
        rootThreadService={fakeRootThreadService}
        {...props}
      />
    );
  }

  describe('the standalone view for a top-level annotation', () => {
    it('loads the annotation thread', () => {
      createComponent();

      assert.calledOnce(fakeLoadAnnotationsService.loadThread);
    });

    context('successfully-loaded annotation thread', () => {
      beforeEach(() => {
        fakeLoadAnnotationsService.loadThread.resolves([
          { id: 'test_annotation_id' },
          { id: 'test_reply_id', references: ['test_annotation_id'] },
        ]);
      });

      it('does not highlight any annotations', async () => {
        createComponent();

        await new Promise(resolve => setTimeout(resolve, 0));

        assert.notCalled(fakeStore.highlightAnnotations);
      });

      it('expands the thread', async () => {
        createComponent();

        await new Promise(resolve => setTimeout(resolve, 0));

        assert.calledWith(fakeStore.setCollapsed, 'test_annotation_id', false);
        assert.calledWith(fakeStore.setCollapsed, 'test_reply_id', false);
      });
    });

    it('shows an error if the annotation could not be fetched', async () => {
      fakeLoadAnnotationsService.loadThread.rejects();
      const onLogin = sinon.stub();
      const wrapper = createComponent({ onLogin });

      // Initially the annotation is not available to the user, so an error
      // should be shown.
      await waitFor(() => {
        wrapper.update();
        return wrapper.exists('SidebarContentError');
      });

      // Simulate clicking the "Login" button in the error.
      const onLoginRequest = wrapper
        .find('SidebarContentError')
        .prop('onLoginRequest');
      onLoginRequest();
      assert.called(onLogin);

      fakeLoadAnnotationsService.loadThread.resetHistory();
      fakeLoadAnnotationsService.loadThread.resolves([
        { id: 'test_annotation_id' },
      ]);
      fakeStore.profile.returns({ userid: 'acct:jimsmith@hypothes.is' });

      // Force re-render. `useStore` would do this in the actual app.
      wrapper.setProps({});

      await waitFor(() => fakeLoadAnnotationsService.loadThread.called);
      assert.isFalse(wrapper.exists('SidebarContentError'));
    });

    it('highlights the annotation if it is a reply', async () => {
      fakeLoadAnnotationsService.loadThread.resolves([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);

      createComponent();

      await new Promise(resolve => setTimeout(resolve, 0));
      assert.calledWith(
        fakeStore.highlightAnnotations,
        sinon.match(['test_annotation_id'])
      );
    });
  });
});
