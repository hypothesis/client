import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

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
      profile: sinon.stub().returns({ userid: '123' }),
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

    [
      { author: '456', moderationStatus: 'DENIED', shouldBeDenied: false },
      { author: '123', moderationStatus: 'DENIED', shouldBeDenied: true },
      { author: '456', moderationStatus: 'APPROVED', shouldBeDenied: false },
      { author: '123', moderationStatus: 'APPROVED', shouldBeDenied: false },
    ].forEach(({ author, moderationStatus, shouldBeDenied }) => {
      it('marks thread as declined when moderation status is DENIED and is not highlighted', () => {
        fakeStore.isAnnotationHighlighted.returns(isHighlighted);
        fakeThread.annotation.user = author;
        fakeThread.annotation.moderation_status = moderationStatus;

        const wrapper = createComponent();
        assert.equal(
          wrapper.find('Card').prop('classes').includes('border-red'),
          !isHighlighted && shouldBeDenied,
        );
      });
    });
  });

  describe('keyboard focus events', () => {
    it('calls hoverAnnotation when focus enters the card (focusin)', () => {
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      // Simulate focusin event
      const focusInEvent = new FocusEvent('focusin', { bubbles: true });
      cardElement.dispatchEvent(focusInEvent);

      assert.calledWith(fakeFrameSync.hoverAnnotation, fakeThread.annotation);
    });

    it('calls hoverAnnotation with null when annotation is null on focusin', () => {
      fakeThread.annotation = null;
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      const focusInEvent = new FocusEvent('focusin', { bubbles: true });
      cardElement.dispatchEvent(focusInEvent);

      assert.calledWith(fakeFrameSync.hoverAnnotation, null);
    });

    it('clears hover when focus leaves the card entirely (focusout with null relatedTarget)', () => {
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      // Simulate focusout event with null relatedTarget (focus leaving document)
      const focusOutEvent = new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: null,
      });
      cardElement.dispatchEvent(focusOutEvent);

      assert.calledWith(fakeFrameSync.hoverAnnotation, null);
    });

    it('clears hover when focusout relatedTarget is not a Node', () => {
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      // Create a focusout event with null relatedTarget (simulating focus leaving document)
      // When relatedTarget is null, it should clear hover
      const focusOutEvent = new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: null,
      });

      cardElement.dispatchEvent(focusOutEvent);

      assert.calledWith(fakeFrameSync.hoverAnnotation, null);
    });

    it('clears hover when focusout relatedTarget is outside the card', () => {
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      // Create an element outside the card
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const focusOutEvent = new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: outsideElement,
      });
      cardElement.dispatchEvent(focusOutEvent);

      assert.calledWith(fakeFrameSync.hoverAnnotation, null);
      document.body.removeChild(outsideElement);
    });

    it('does not clear hover when focus moves within the card (focusout)', () => {
      const wrapper = createComponent();
      const cardElement = wrapper.find(threadCardSelector).getDOMNode();

      // Create an element inside the card
      const innerElement = document.createElement('button');
      cardElement.appendChild(innerElement);

      // Simulate focusout event with relatedTarget inside the card
      const focusOutEvent = new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: innerElement,
      });
      cardElement.dispatchEvent(focusOutEvent);

      // Should not have been called with null (focus is still within card)
      assert.neverCalledWith(fakeFrameSync.hoverAnnotation, null);
    });
  });

  describe('key down', () => {
    [
      { key: 'Enter', shouldScroll: true },
      { key: ' ', shouldScroll: true },
      { key: 'ArrowUp', shouldScroll: false },
      { key: 'Escape', shouldScroll: false },
    ].forEach(({ key, shouldScroll }) => {
      it('scrolls to the annotation when Enter or Space are pressed on the `ThreadCard`', () => {
        const wrapper = createComponent();

        wrapper.find(threadCardSelector).simulate('keydown', { key });

        assert.equal(fakeFrameSync.scrollToAnnotation.called, shouldScroll);
      });
    });

    it('does not scroll to annotation when key is pressed in `ThreadCard` targeting other element', () => {
      const wrapper = createComponent();

      wrapper
        .find(threadCardSelector)
        .props()
        .onKeyDown({ key: 'Enter', target: document.createElement('a') });

      assert.notCalled(fakeFrameSync.scrollToAnnotation);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
