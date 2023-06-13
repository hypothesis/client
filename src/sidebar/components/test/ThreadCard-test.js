import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import ThreadCard, { $imports } from '../ThreadCard';

describe('ThreadCard', () => {
  let container;
  let fakeDebounce;
  let fakeFrameSync;
  let fakeStore;
  let fakeThread;

  const threadCardSelector = 'div[data-testid="thread-card"]';

  function createComponent(props) {
    return mount(
      <ThreadCard frameSync={fakeFrameSync} thread={fakeThread} {...props} />,
      { attachTo: container }
    );
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);

    fakeDebounce = sinon.stub().returnsArg(0);
    fakeFrameSync = {
      hoverAnnotation: sinon.stub(),
      scrollToAnnotation: sinon.stub(),
    };
    fakeStore = {
      annotationFocusRequest: sinon.stub().returns(null),
      clearAnnotationFocusRequest: sinon.stub(),
      isAnnotationHovered: sinon.stub().returns(false),
      route: sinon.stub(),
    };

    fakeThread = {
      id: 't1',
      annotation: { $tag: 'myTag' },
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      'lodash.debounce': fakeDebounce,
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
    container.remove();
  });

  it('renders a `Thread` for the passed `thread`', () => {
    const wrapper = createComponent();
    assert(wrapper.find('Thread').props().thread === fakeThread);
  });

  it('sets Card to active if the annotation thread is hovered', () => {
    fakeStore.isAnnotationHovered.returns(true);

    const wrapper = createComponent();

    assert.isTrue(
      wrapper.find('Card[data-testid="thread-card"]').props().active
    );
  });

  describe('mouse and click events', () => {
    it('scrolls to the annotation when the `ThreadCard` is clicked', () => {
      const wrapper = createComponent();

      wrapper.find(threadCardSelector).simulate('click');

      assert.calledWith(
        fakeFrameSync.scrollToAnnotation,
        fakeThread.annotation
      );
    });

    it('focuses the annotation thread when mouse enters', () => {
      const wrapper = createComponent();

      wrapper.find(threadCardSelector).simulate('mouseenter');

      assert.calledWith(fakeFrameSync.hoverAnnotation, fakeThread.annotation);
    });

    it('unfocuses the annotation thread when mouse exits', () => {
      const wrapper = createComponent();

      wrapper.find(threadCardSelector).simulate('mouseleave');

      assert.calledWith(fakeFrameSync.hoverAnnotation, null);
    });

    ['button', 'a'].forEach(tag => {
      it(`does not scroll to the annotation if the event's target or ancestor is a ${tag}`, () => {
        const wrapper = createComponent();
        const nodeTarget = document.createElement(tag);
        const nodeChild = document.createElement('div');
        nodeTarget.appendChild(nodeChild);

        wrapper.find(threadCardSelector).props().onClick({
          target: nodeTarget,
        });
        wrapper.find(threadCardSelector).props().onClick({
          target: nodeChild,
        });
        assert.notCalled(fakeFrameSync.scrollToAnnotation);
      });
    });
  });

  describe('keyboard events', () => {
    ['Enter', ' '].forEach(key => {
      it('scrolls to annotation when `Enter` or `Space` are pressed', () => {
        const wrapper = createComponent();

        wrapper.find(threadCardSelector).simulate('keydown', { key });

        assert.calledWith(
          fakeFrameSync.scrollToAnnotation,
          fakeThread.annotation
        );
      });

      it('does not scroll to annotation when it is not set', () => {
        const wrapper = createComponent({ thread: {} });

        wrapper.find(threadCardSelector).simulate('keypress', { key });

        assert.notCalled(fakeFrameSync.scrollToAnnotation);
      });
    });

    ['a', 'b', 'Escape', 'ArrowDown'].forEach(key => {
      it('does not scroll to annotation when key other than `Enter` or `Space` is pressed', () => {
        const wrapper = createComponent();

        wrapper.find(threadCardSelector).simulate('keypress', { key });

        assert.notCalled(fakeFrameSync.scrollToAnnotation);
      });
    });
  });

  describe('keyboard focus request handling', () => {
    [null, 'other-annotation'].forEach(focusRequest => {
      it('does not focus thread if there is no matching focus request', () => {
        fakeStore.annotationFocusRequest.returns(focusRequest);

        createComponent();

        const threadCard = container.querySelector(threadCardSelector);

        assert.notEqual(document.activeElement, threadCard);
        assert.notCalled(fakeStore.clearAnnotationFocusRequest);
      });
    });

    it('gives focus to the thread if there is a matching focus request', () => {
      fakeStore.annotationFocusRequest.returns('t1');

      createComponent();

      const threadCard = container.querySelector(threadCardSelector);
      assert.equal(document.activeElement, threadCard);
      assert.called(fakeStore.clearAnnotationFocusRequest);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});
