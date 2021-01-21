import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import Thread from '../thread';
import { $imports } from '../thread';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

// Utility functions to build nested threads
let lastThreadId = 0;
const createThread = () => {
  lastThreadId++;
  return {
    id: lastThreadId.toString(),
    annotation: {},
    children: [],
    parent: undefined,
    collapsed: false,
    visible: true,
    depth: 0,
    replyCount: 0,
  };
};

const addChildThread = parent => {
  const childThread = createThread();
  childThread.parent = parent.id;
  parent.children.push(childThread);
  return childThread;
};

// NB: This logic lifted from `helpers/build-thread.js`
function countRepliesAndDepth(thread, depth) {
  const children = thread.children.map(child => {
    return countRepliesAndDepth(child, depth + 1);
  });
  return {
    ...thread,
    children,
    depth,
    replyCount: children.reduce((total, child) => {
      return total + 1 + child.replyCount;
    }, 0),
  };
}

/**
 * Utility function: construct a thread with several children
 */
const buildThreadWithChildren = () => {
  let thread = createThread();
  addChildThread(thread);
  addChildThread(thread);
  addChildThread(thread.children[0]);
  addChildThread(thread.children[0].children[0]);
  addChildThread(thread.children[1]);
  // `depth` and `replyCount` are computed properties...
  thread = countRepliesAndDepth(thread, 0);
  return thread;
};

describe('Thread', () => {
  let fakeStore;
  let fakeThreadsService;
  let fakeThreadUtil;

  // Because this is a recursive component, for most tests, we'll want single,
  // flat `thread` object (so we are not misled by rendered children)
  const createComponent = props => {
    return mount(
      <Thread
        showDocumentInfo={false}
        thread={createThread()}
        threadsService={fakeThreadsService}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeStore = {
      setExpanded: sinon.stub(),
    };

    fakeThreadsService = {
      forceVisible: sinon.stub(),
    };

    fakeThreadUtil = {
      countHidden: sinon.stub(),
      countVisible: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
      '../helpers/thread': fakeThreadUtil,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('thread not at top level (depth > 0)', () => {
    // "Reply" here means that the thread has a `depth` of > 0, not that it is
    // _strictly_ a reply—true annotation replies (per `util.annotation_metadata`)
    // have `references`
    let replyThread;

    // Retrieve the (caret) button for showing and hiding replies
    const getToggleButton = wrapper => {
      return wrapper.find('Button').filter('.thread__collapse-button');
    };

    beforeEach(() => {
      replyThread = createThread();
      replyThread.depth = 1;
      replyThread.parent = '1';
    });

    it('shows the reply toggle controls', () => {
      const wrapper = createComponent({ thread: replyThread });
      assert.lengthOf(getToggleButton(wrapper), 1);
    });

    it('collapses the thread when reply toggle clicked on expanded thread', () => {
      replyThread.collapsed = false;
      const wrapper = createComponent({ thread: replyThread });

      act(() => {
        getToggleButton(wrapper).props().onClick();
      });

      assert.calledOnce(fakeStore.setExpanded);
      assert.calledWith(fakeStore.setExpanded, replyThread.id, false);
    });

    it('assigns an appropriate CSS class to the element', () => {
      const wrapper = createComponent({ thread: replyThread });

      assert.isTrue(wrapper.find('.thread').hasClass('thread--reply'));
    });
  });

  context('visible thread with annotation', () => {
    it('renders the annotation moderation banner', () => {
      // NB: In the default `thread` provided, `visible` is `true` and there
      // is an `annotation` object
      const wrapper = createComponent();

      assert.isTrue(wrapper.exists('ModerationBanner'));
    });

    it('renders the annotation', () => {
      const wrapper = createComponent();

      assert.isTrue(wrapper.exists('Annotation'));
    });
  });

  context('collapsed thread with annotation and children', () => {
    let collapsedThread;

    beforeEach(() => {
      collapsedThread = buildThreadWithChildren();
      collapsedThread.collapsed = true;
    });

    it('assigns an appropriate CSS class to the element', () => {
      const wrapper = createComponent({ thread: collapsedThread });
      assert.isTrue(wrapper.find('.thread').hasClass('is-collapsed'));
      assert.isFalse(wrapper.find('.thread__collapse-button').exists());
    });

    it('renders reply toggle controls when thread has a parent', () => {
      collapsedThread.parent = '1';
      const wrapper = createComponent({ thread: collapsedThread });

      assert.isTrue(wrapper.find('.thread__collapse-button').exists());
    });

    it('does not render child threads', () => {
      const wrapper = createComponent({ thread: collapsedThread });

      assert.isFalse(wrapper.find('.thread__children').exists());
    });
  });

  context('thread annotation has been deleted', () => {
    let noAnnotationThread;

    beforeEach(() => {
      noAnnotationThread = createThread();
      noAnnotationThread.annotation = undefined;
    });

    it('does not render an annotation or a moderation banner', () => {
      const wrapper = createComponent({ thread: noAnnotationThread });

      assert.isFalse(wrapper.find('Annotation').exists());
      assert.isFalse(wrapper.find('ModerationBanner').exists());
    });

    it('renders an unavailable message', () => {
      const wrapper = createComponent({ thread: noAnnotationThread });

      assert.isTrue(wrapper.find('.thread__unavailable-message').exists());
    });
  });

  context('one or more threads hidden by applied search filter', () => {
    beforeEach(() => {
      fakeThreadUtil.countHidden.returns(1);
    });

    it('forces the hidden threads visible when show-hidden button clicked', () => {
      const thread = createThread();
      const wrapper = createComponent({ thread });

      act(() => {
        wrapper
          .find('Button')
          .filter({ buttonText: 'Show 1 more in conversation' })
          .props()
          .onClick();
      });

      assert.calledOnce(fakeThreadsService.forceVisible);
      assert.calledWith(fakeThreadsService.forceVisible, thread);
    });
  });

  context('thread with child threads', () => {
    let threadWithChildren;

    beforeEach(() => {
      // A child must have at least one visible item to be rendered
      fakeThreadUtil.countVisible.returns(1);
      threadWithChildren = buildThreadWithChildren();
    });

    it('renders child threads', () => {
      const wrapper = createComponent({ thread: threadWithChildren });

      assert.equal(
        wrapper.find('.thread__children').find('Thread').length,
        threadWithChildren.replyCount
      );
    });

    it('renders only those children with at least one visible item', () => {
      // This has the effect of making the thread's first child _and_ all of
      // that child threads descendents not render.
      fakeThreadUtil.countVisible.onFirstCall().returns(0);

      const wrapper = createComponent({ thread: threadWithChildren });

      // The number of children that end up getting rendered is equal to
      // all of the second child's replies plus the second child itself.
      assert.equal(
        wrapper.find('.thread__children').find('Thread').length,
        threadWithChildren.children[1].replyCount + 1
      );
    });
  });

  describe('a11y', () => {
    let threadWithChildren;

    beforeEach(() => {
      threadWithChildren = buildThreadWithChildren();
    });

    it(
      'should pass a11y checks',
      checkAccessibility({
        content: () => createComponent({ thread: threadWithChildren }),
      })
    );
  });
});
