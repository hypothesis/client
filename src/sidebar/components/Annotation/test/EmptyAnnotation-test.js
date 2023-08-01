import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import EmptyAnnotation, { $imports } from '../EmptyAnnotation';

describe('EmptyAnnotation', () => {
  const createComponent = props => {
    return mount(
      <EmptyAnnotation
        isReply={false}
        replyCount={0}
        threadIsCollapsed={true}
        {...props}
      />,
    );
  };

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('reply thread toggle', () => {
    it('should render a toggle button if toggle callback provided', () => {
      const fakeOnToggleReplies = sinon.stub();
      const wrapper = createComponent({
        onToggleReplies: fakeOnToggleReplies,
        replyCount: 5,
        threadIsCollapsed: true,
      });

      const toggle = wrapper.find('AnnotationReplyToggle');

      assert.isTrue(toggle.exists());
      assert.equal(toggle.props().onToggleReplies, fakeOnToggleReplies);
      assert.equal(toggle.props().replyCount, 5);
      assert.equal(toggle.props().threadIsCollapsed, true);
    });

    it('should not render a reply toggle if no callback provided', () => {
      const wrapper = createComponent({
        isReply: false,
        replyCount: 5,
        threadIsCollapsed: true,
      });

      assert.isFalse(wrapper.find('AnnotationReplyToggle').exists());
    });
  });

  describe('labeling and description', () => {
    it('should render a label and message for top-level missing annotations', () => {
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('article').props()['aria-label'],
        'Annotation with unavailable content',
      );
      assert.equal(wrapper.text(), 'Message not available.');
    });

    it('should label the EmptyAnnotation as a reply if it is a reply', () => {
      const wrapper = createComponent({
        isReply: true,
      });

      assert.equal(
        wrapper.find('article').props()['aria-label'],
        'Reply with unavailable content',
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createComponent(),
      },
      {
        name: 'when a collapsed top-level thread',
        content: () => {
          return createComponent({ isReply: false, threadIsCollapsed: true });
        },
      },
      {
        name: 'when a collapsed reply',
        content: () => {
          return createComponent({ isReply: true, threadIsCollapsed: true });
        },
      },
    ]),
  );
});
