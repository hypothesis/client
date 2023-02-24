import { mount } from 'enzyme';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import { getImports } from '../../../test-util/mockable-imports';
import { waitFor } from '../../../test-util/wait';
import type { LoadAnnotationsService } from '../../services/load-annotations';
import type { SidebarStore } from '../../store';
import * as AnnotationViewExports from '../AnnotationView';
import type { AnnotationViewProps } from '../AnnotationView';

const AnnotationView = AnnotationViewExports.default;
const $imports = getImports(AnnotationViewExports);

describe('AnnotationView', () => {
  let highlightAnnotations: SinonStub;
  let setExpanded: SinonStub;
  let profile: SinonStub;
  let fakeStore: SidebarStore;
  let fakeOnLogin: SinonStub;
  let fakeUseRootThread;
  let loadThread: SinonStub;
  let fakeLoadAnnotationsService: LoadAnnotationsService;

  beforeEach(() => {
    highlightAnnotations = sinon.stub();
    setExpanded = sinon.stub();
    profile = sinon.stub().returns({ userid: null });
    fakeStore = {
      clearAnnotations: sinon.stub(),
      highlightAnnotations,
      routeParams: sinon.stub().returns({ id: 'test_annotation_id' }),
      profile,
      setExpanded,
    } as unknown as SidebarStore; // We need a proper mocking lib

    loadThread = sinon.stub().resolves([]);
    fakeLoadAnnotationsService = {
      loadThread,
    } as unknown as LoadAnnotationsService; // We need a proper mocking lib

    fakeOnLogin = sinon.stub();

    fakeUseRootThread = sinon.stub().returns({
      children: [],
    });

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': { useRootThread: fakeUseRootThread },
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent(props: Partial<AnnotationViewProps> = {}) {
    return mount(
      (
        <AnnotationView
          loadAnnotationsService={fakeLoadAnnotationsService}
          onLogin={fakeOnLogin}
          {...props}
        />
      ) as any // See https://github.com/preactjs/preact/issues/1206#issuecomment-854862736
    );
  }

  describe('the standalone view for a top-level annotation', () => {
    it('loads the annotation thread', () => {
      createComponent();

      assert.calledOnce(loadThread);
    });

    context('successfully-loaded annotation thread', () => {
      beforeEach(() => {
        loadThread.resolves([
          { id: 'test_annotation_id' },
          { id: 'test_reply_id', references: ['test_annotation_id'] },
        ]);
      });

      it('does not highlight any annotations', async () => {
        createComponent();

        await new Promise(resolve => setTimeout(resolve, 0));

        assert.notCalled(highlightAnnotations);
      });

      it('expands the thread', async () => {
        createComponent();

        await new Promise(resolve => setTimeout(resolve, 0));

        assert.calledWith(setExpanded, 'test_annotation_id', true);
        assert.calledWith(setExpanded, 'test_reply_id', true);
      });
    });

    it('shows an error if the annotation could not be fetched', async () => {
      loadThread.rejects();
      const onLogin = sinon.stub();
      const wrapper = createComponent({ onLogin });

      // Initially the annotation is not available to the user, so an error
      // should be shown.
      await waitFor(() => {
        wrapper.update();
        return wrapper.exists('SidebarContentError');
      });

      // Simulate clicking the "Login" button in the error.
      const onLoginRequest: () => void = wrapper
        .find('SidebarContentError')
        .prop('onLoginRequest');
      onLoginRequest();
      assert.called(onLogin);

      loadThread.resetHistory();
      loadThread.resolves([{ id: 'test_annotation_id' }]);
      profile.returns({ userid: 'acct:jimsmith@hypothes.is' });

      // Force re-render. `useStore` would do this in the actual app.
      wrapper.setProps({});

      await waitFor(() => loadThread.called);
      assert.isFalse(wrapper.exists('SidebarContentError'));
    });

    it('highlights the annotation if it is a reply', async () => {
      loadThread.resolves([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);

      createComponent();

      await new Promise(resolve => setTimeout(resolve, 0));
      assert.calledWith(
        highlightAnnotations,
        sinon.match(['test_annotation_id'])
      );
    });
  });
});
