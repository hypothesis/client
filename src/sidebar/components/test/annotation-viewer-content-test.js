import { createElement } from 'preact';
import { mount } from 'enzyme';

import { waitFor } from '../../../test-util/wait';
import mockImportedComponents from '../../../test-util/mock-imported-components';

import AnnotationViewerContent, {
  $imports,
} from '../annotation-viewer-content';

/**
 * Fake implementation of the `api` service.
 */
class FakeApi {
  constructor(annots) {
    this.annotations = annots;

    this.annotation = {
      get: async query => this.annotations.find(a => a.id === query.id),
    };
  }

  async search(query) {
    let matches = [];
    if (query.references) {
      matches = this.annotations.filter(
        a => a.references && a.references.includes(query.references)
      );
    }
    return { rows: matches };
  }
}

describe('AnnotationViewerContent', () => {
  let fakeStore;
  let fakeRootThread;
  let fakeStreamer;
  let fakeStreamFilter;

  beforeEach(() => {
    fakeStore = {
      addAnnotations: sinon.stub(),
      clearAnnotations: sinon.stub(),
      getState: sinon.stub().returns({}),
      highlightAnnotations: sinon.stub(),
      routeParams: sinon.stub().returns({ id: 'test_annotation_id' }),
      profile: sinon.stub().returns({ userid: null }),
      setCollapsed: sinon.stub(),
    };

    fakeRootThread = { thread: sinon.stub().returns({}) };

    fakeStreamer = {
      setConfig: () => {},
      connect: () => {},
    };

    fakeStreamFilter = {
      addClause: () => {
        return {
          addClause: () => {},
        };
      },
      getFilter: () => {},
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent({ api, onLogin = sinon.stub() }) {
    return mount(
      <AnnotationViewerContent
        api={api}
        onLogin={onLogin}
        rootThread={fakeRootThread}
        streamer={fakeStreamer}
        streamFilter={fakeStreamFilter}
      />
    );
  }

  function waitForAnnotationsToLoad() {
    return waitFor(() => fakeStore.addAnnotations.called);
  }

  describe('the standalone view for a top-level annotation', () => {
    it('loads the annotation and all replies', async () => {
      const fakeApi = new FakeApi([
        { id: 'test_annotation_id' },
        { id: 'test_reply_id', references: ['test_annotation_id'] },
      ]);
      createComponent({ api: fakeApi });

      await waitForAnnotationsToLoad();

      assert.calledOnce(fakeStore.addAnnotations);
      assert.calledWith(
        fakeStore.addAnnotations,
        sinon.match(fakeApi.annotations)
      );
    });

    it('does not highlight any annotations', async () => {
      const fakeApi = new FakeApi([
        { id: 'test_annotation_id' },
        { id: 'test_reply_id', references: ['test_annotation_id'] },
      ]);
      createComponent({ api: fakeApi });

      await waitForAnnotationsToLoad();

      assert.notCalled(fakeStore.highlightAnnotations);
    });

    it('shows an error if the annotation could not be fetched', async () => {
      const fakeApi = new FakeApi([]);
      const onLogin = sinon.stub();
      const wrapper = createComponent({ api: fakeApi, onLogin });

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

      // After the user logs in, the annotation should be shown.
      fakeApi.annotations = [{ id: 'test_annotation_id' }];
      fakeStore.profile.returns({ userid: 'acct:jimsmith@hypothes.is' });

      // Force re-render. `useStore` would do this in the actual app.
      wrapper.setProps({});

      await waitForAnnotationsToLoad();
      assert.isFalse(wrapper.exists('SidebarContentError'));
    });
  });

  describe('the standalone view for a reply', () => {
    it('loads the top-level annotation and all replies', async () => {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);
      createComponent({ api: fakeApi });

      await waitForAnnotationsToLoad();

      assert.calledWith(
        fakeStore.addAnnotations,
        sinon.match(fakeApi.annotations)
      );
    });

    it('expands the thread', async () => {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);

      createComponent({ api: fakeApi });

      await waitForAnnotationsToLoad();

      assert.calledWith(fakeStore.setCollapsed, 'parent_id', false);
      assert.calledWith(fakeStore.setCollapsed, 'test_annotation_id', false);
    });

    it('highlights the reply', async () => {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);
      createComponent({ api: fakeApi });

      await waitForAnnotationsToLoad();

      assert.calledWith(
        fakeStore.highlightAnnotations,
        sinon.match(['test_annotation_id'])
      );
    });
  });
});
