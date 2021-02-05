import { mount } from 'enzyme';

import AnnotationMissing, { $imports } from '../AnnotationMissing';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationMissing', () => {
  let fakeOnToggleReplies;

  function createComponent(props = {}) {
    return mount(
      <AnnotationMissing
        hasAppliedFilter={false}
        isReply={false}
        onToggleReplies={fakeOnToggleReplies}
        replyCount={5}
        threadIsCollapsed={true}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnToggleReplies = sinon.stub();
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('collapsed reply', () => {
    it('does not show message-unavailable text', () => {
      const wrapper = createComponent({
        isReply: true,
        threadIsCollapsed: true,
      });
      assert.equal(wrapper.text(), '');
    });

    it('does not render a reply toggle', () => {
      const wrapper = createComponent({
        isReply: true,
        threadIsCollapsed: true,
      });

      assert.isFalse(wrapper.find('AnnotationReplyToggle').exists());
    });
  });

  context('collapsed thread, not a reply', () => {
    it('shows message-unavailable text', () => {
      const wrapper = createComponent({
        isReply: false,
        threadIsCollapsed: true,
      });

      assert.match(wrapper.text(), /Message not available/);
    });

    it('renders a reply toggle control', () => {
      const wrapper = createComponent({
        isReply: false,
        threadIsCollapsed: true,
      });

      const toggle = wrapper.find('AnnotationReplyToggle');
      assert.equal(toggle.props().onToggleReplies, fakeOnToggleReplies);
    });
  });

  context('expanded thread, not a reply', () => {
    it('shows message-unavailable text', () => {
      const wrapper = createComponent({
        isReply: false,
        threadIsCollapsed: false,
      });

      assert.match(wrapper.text(), /Message not available/);
    });

    it('renders a reply toggle control', () => {
      const wrapper = createComponent({
        isReply: false,
        threadIsCollapsed: false,
      });

      const toggle = wrapper.find('AnnotationReplyToggle');
      assert.equal(toggle.props().onToggleReplies, fakeOnToggleReplies);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    })
  );
});
