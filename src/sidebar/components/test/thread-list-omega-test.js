import { mount } from 'enzyme';
import { createElement } from 'preact';

import events from '../../events';
import { act } from 'preact/test-utils';

import ThreadList from '../thread-list-omega';
import { $imports } from '../thread-list-omega';

//import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('ThreadListOmega', () => {
  let fakeDebounce;
  let fakeDomUtil;
  let fakeMetadata;
  let fakeTopThread;
  let fakeRootScope;
  let fakeScrollContainer;
  let fakeStore;
  let fakeVisibleThreadsUtil;

  function createComponent(props) {
    return mount(
      <ThreadList
        thread={fakeTopThread}
        $rootScope={fakeRootScope}
        {...props}
      />,
      { attachTo: fakeScrollContainer }
    );
  }

  beforeEach(() => {
    fakeDebounce = sinon.stub().returns(() => null);
    fakeDomUtil = {
      getElementHeightWithMargins: sinon.stub().returns(0),
    };
    fakeMetadata = {
      isHighlight: sinon.stub().returns(false),
      isReply: sinon.stub().returns(false),
    };

    fakeRootScope = {
      eventCallbacks: {},

      $apply: function (callback) {
        callback();
      },

      $on: function (event, callback) {
        if (event === events.BEFORE_ANNOTATION_CREATED) {
          this.eventCallbacks[event] = callback;
        }
      },

      $broadcast: sinon.stub(),
    };

    fakeScrollContainer = document.createElement('div');
    fakeScrollContainer.className = 'js-thread-list-scroll-root';
    fakeScrollContainer.style.height = '2000px';
    document.body.appendChild(fakeScrollContainer);

    fakeStore = {
      clearSelection: sinon.stub(),
    };

    fakeTopThread = {
      id: 't0',
      annotation: { $tag: 'myTag0' },
      children: [
        { id: 't1', children: [], annotation: { $tag: 't1' } },
        { id: 't2', children: [], annotation: { $tag: 't2' } },
        { id: 't3', children: [], annotation: { $tag: 't3' } },
        { id: 't4', children: [], annotation: { $tag: 't4' } },
      ],
    };

    fakeVisibleThreadsUtil = {
      calculateVisibleThreads: sinon.stub().returns({
        visibleThreads: fakeTopThread.children,
        offscreenUpperHeight: 400,
        offscreenLowerHeight: 600,
      }),
      THREAD_DIMENSION_DEFAULTS: {
        defaultHeight: 200,
      },
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      'lodash.debounce': fakeDebounce,
      '../store/use-store': callback => callback(fakeStore),
      '../util/annotation-metadata': fakeMetadata,
      '../util/dom': fakeDomUtil,
      '../util/visible-threads': fakeVisibleThreadsUtil,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('works', () => {
    const wrapper = createComponent();

    assert.isTrue(wrapper.find('section').exists());
  });

  it('calculates visible threads', () => {
    createComponent();

    assert.calledWith(
      fakeVisibleThreadsUtil.calculateVisibleThreads,
      fakeTopThread.children,
      sinon.match({}),
      0,
      sinon.match.number
    );
  });

  context('new annotation created in application', () => {
    it('attaches a listener for the BEFORE_ANNOTATION_CREATED event', () => {
      fakeRootScope.$on = sinon.stub();

      createComponent();

      assert.calledWith(
        fakeRootScope.$on,
        events.BEFORE_ANNOTATION_CREATED,
        sinon.match.func
      );
    });

    it('clears the current selection in the store', () => {
      createComponent();

      fakeRootScope.eventCallbacks[events.BEFORE_ANNOTATION_CREATED]({}, {});

      assert.calledOnce(fakeStore.clearSelection);
    });

    it('does not clear the selection in the store if new annotation is a highlight', () => {
      fakeMetadata.isHighlight.returns(true);
      createComponent();

      fakeRootScope.eventCallbacks[events.BEFORE_ANNOTATION_CREATED]({}, {});

      assert.notCalled(fakeStore.clearSelection);
    });

    it('does not clear the selection in the store if new annotation is a reply', () => {
      fakeMetadata.isReply.returns(true);
      createComponent();

      fakeRootScope.eventCallbacks[events.BEFORE_ANNOTATION_CREATED]({}, {});

      assert.notCalled(fakeStore.clearSelection);
    });
  });

  context('active scroll to an annotation thread', () => {
    let stubbedDocument;
    let stubbedFakeScrollContainer;
    let fakeScrollTop;

    beforeEach(() => {
      fakeScrollTop = sinon.stub();
      stubbedFakeScrollContainer = sinon
        .stub(fakeScrollContainer, 'scrollTop')
        .set(fakeScrollTop);
      stubbedDocument = sinon
        .stub(document, 'querySelector')
        .returns(fakeScrollContainer);
    });

    afterEach(() => {
      stubbedFakeScrollContainer.restore();
      stubbedDocument.restore();
    });

    it('should do nothing if there is no active annotation thread to scroll to', () => {
      createComponent();

      assert.notCalled(fakeScrollTop);
    });

    it('should do nothing if the annotation thread to scroll to is not in DOM', () => {
      createComponent();

      act(() => {
        fakeRootScope.eventCallbacks[events.BEFORE_ANNOTATION_CREATED](
          {},
          { $tag: 'nonexistent' }
        );
      });

      assert.notCalled(fakeScrollTop);
    });

    it('should set the scroll container `scrollTop` to derived position of thread', () => {
      createComponent();

      act(() => {
        fakeRootScope.eventCallbacks[events.BEFORE_ANNOTATION_CREATED](
          {},
          fakeTopThread.children[3].annotation
        );
      });

      // The third thread in a collection of threads at default height (200)
      // should be at 600px. This setting of `scrollTop` is the only externally-
      // observable thing that happens here...
      assert.calledWith(fakeScrollTop, 600);
    });
  });

  describe('scroll and resize event handling', () => {
    const debouncedFn = sinon.stub();

    beforeEach(() => {
      fakeDebounce.returns(debouncedFn);
    });

    it('updates scroll position and window height for recalculation on container scroll', () => {
      createComponent();
      document
        .querySelector('.js-thread-list-scroll-root')
        .dispatchEvent(new Event('scroll'));

      assert.calledOnce(debouncedFn);
    });

    it('updates scroll position and window height for recalculation on window resize', () => {
      createComponent();
      window.dispatchEvent(new Event('resize'));

      // TODO
      assert.calledTwice(debouncedFn);
    });
  });

  context('when top-level threads change', () => {
    it('recalculates thread heights', () => {
      const wrapper = createComponent();
      // Initial render and effect hooks will trigger calculation twice
      fakeDomUtil.getElementHeightWithMargins.resetHistory();
      // Let's see it respond to the top-level threads changing
      wrapper.setProps({ thread: fakeTopThread });
      // It should check the element height for each top-level thread (assuming
      // they are all onscreen, which these test threads "are")
      assert.equal(
        fakeDomUtil.getElementHeightWithMargins.callCount,
        fakeTopThread.children.length
      );
    });
  });

  it('renders dimensional elements above and below visible threads', () => {
    const wrapper = createComponent();
    const upperDiv = wrapper.find('div').first();
    const lowerDiv = wrapper.find('div').last();
    assert.equal(upperDiv.getDOMNode().style.height, '400px');
    assert.equal(lowerDiv.getDOMNode().style.height, '600px');
  });

  it('renders a `ThreadCard` for each visible thread', () => {
    const wrapper = createComponent();
    const cards = wrapper.find('ThreadCard');
    assert.equal(cards.length, fakeTopThread.children.length);
  });

  // it(
  //   'should pass a11y checks',
  //   checkAccessibility({
  //     content: () => createComponent(),
  //   })
  // );
});
