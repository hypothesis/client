import { mount } from 'enzyme';
import { createElement } from 'preact';

import mockImportedComponents from '../../../test-util/mock-imported-components';

import NotebookView, { $imports } from '../notebook-view';

describe('NotebookView', () => {
  let fakeLoadAnnotationsService;
  let fakeUseRootThread;
  let fakeStore;

  beforeEach(() => {
    fakeLoadAnnotationsService = {
      load: sinon.stub(),
    };

    fakeUseRootThread = sinon.stub().returns({});

    fakeStore = {
      focusedGroup: sinon.stub().returns({}),
      setSortKey: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': fakeUseRootThread,
      '../store/use-store': { useStoreProxy: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent() {
    return mount(
      <NotebookView loadAnnotationsService={fakeLoadAnnotationsService} />
    );
  }

  it('loads annotations for the currently-focused group', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    createComponent();

    assert.calledWith(
      fakeLoadAnnotationsService.load,
      sinon.match({ groupId: 'hallothere', maxResults: 5000 })
    );
    assert.calledWith(fakeStore.setSortKey, 'Newest');
  });

  it('renders the current group name', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    const wrapper = createComponent();

    assert.equal(wrapper.find('.notebook-view__heading').text(), 'Hallo');
  });

  it('renders a placeholder if group name missing', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere' });
    const wrapper = createComponent();

    assert.equal(wrapper.find('.notebook-view__heading').text(), '…');
  });

  it('renders results (counts)', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('NotebookResultCount').exists());
  });

  it('renders filters', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('NotebookFilters').exists());
  });
});
