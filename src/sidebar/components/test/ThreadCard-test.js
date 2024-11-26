import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import ThreadCard, { $imports } from '../ThreadCard';

describe('ThreadCard', () => {
  let fakeDebounce;
  let fakeFrameSync;
  let fakeStore;
  let fakeThread;

  const threadCardSelector = 'div[data-testid="thread-card"]';

  function createComponent(props) {
    return mount(
      <ThreadCard frameSync={fakeFrameSync} thread={fakeThread} {...props} />,
      { connected: true },
    );
  }

  beforeEach(() => {
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
      isAnnotationHighlighted: sinon.stub().returns(false),
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
  });

  it('renders a `Thread` for the passed `thread`', () => {
    const wrapper = createComponent();
    assert(wrapper.find('Thread').props().thread === fakeThread);
  });

  it('sets Card to active if the annotation thread is hovered', () => {
    fakeStore.isAnnotationHovered.returns(true);

    const wrapper = createComponent();

    assert.isTrue(
      wrapper.find('Card[data-testid="thread-card"]').props().active,
    );
  });

  describe('mouse and click events', () => {
    it('scrolls to the annotation when the `ThreadCard` is clicked', () => {
      const wrapper = createComponent();

      wrapper.find(threadCardSelector).simulate('click');

      assert.calledWith(
        fakeFrameSync.scrollToAnnotation,
        fakeThread.annotation,
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

  describe('keyboard focus request handling', () => {
    [null, 'other-annotation'].forEach(focusRequest => {
      it('does not focus thread if there is no matching focus request', () => {
        fakeStore.annotationFocusRequest.returns(focusRequest);

        const wrapper = createComponent();
        const threadCard = wrapper.find(threadCardSelector).getDOMNode();

        assert.notEqual(document.activeElement, threadCard);
        assert.notCalled(fakeStore.clearAnnotationFocusRequest);
      });
    });

    it('gives focus to the thread if there is a matching focus request', () => {
      fakeStore.annotationFocusRequest.returns('t1');

      const wrapper = createComponent();

      const threadCard = wrapper.find(threadCardSelector).getDOMNode();
      assert.equal(document.activeElement, threadCard);
      assert.called(fakeStore.clearAnnotationFocusRequest);
    });
  });

  [true, false].forEach(isHighlighted => {
    it('applies UI changes when annotation is highlighted', () => {
      fakeStore.isAnnotationHighlighted.returns(isHighlighted);
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('Card').prop('classes').includes('border-brand'),
        isHighlighted,
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
