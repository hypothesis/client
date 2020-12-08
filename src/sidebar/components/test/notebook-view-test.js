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

  describe('results count', () => {
    [
      {
        rootThread: { totalChildren: 5, replyCount: 15 },
        expected: '5 threads (15 annotations)',
      },
      {
        rootThread: { totalChildren: 0, replyCount: 0 },
        expected: 'No results',
      },
      {
        rootThread: { totalChildren: 0, replyCount: 15 },
        expected: 'No results',
      },
      {
        rootThread: { totalChildren: 1, replyCount: 1 },
        expected: '1 thread (1 annotation)',
      },
    ].forEach(test => {
      it('renders number of threads and annotations', () => {
        fakeUseRootThread.returns(test.rootThread);
        const wrapper = createComponent();

        assert.equal(
          wrapper.find('.notebook-view__results').text(),
          test.expected
        );
      });
    });
  });
});
