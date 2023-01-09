import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { checkAccessibility } from '../../../../test-util/accessibility';

import AnnotationReplyToggle from '../AnnotationReplyToggle';

describe('AnnotationReplyToggle', () => {
  let fakeOnToggleReplies;

  function createComponent(props = {}) {
    return mount(
      <AnnotationReplyToggle
        onToggleReplies={fakeOnToggleReplies}
        replyCount={5}
        threadIsCollapsed={true}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnToggleReplies = sinon.stub();
    // Note that this component does not mock imported components
    // because it entirely consists of a `LinkButton`
  });

  it('renders expand wording if thread is collapsed', () => {
    const wrapper = createComponent();

    assert.match(wrapper.text(), /^Show replies/);
  });

  it('renders collapse wording if thread is expanded', () => {
    const wrapper = createComponent({ threadIsCollapsed: false });

    assert.match(wrapper.text(), /^Hide replies/);
  });

  it('sets `aria-expanded` based on thread collapsed status', () => {
    const expandedWrapper = createComponent({ threadIsCollapsed: false });
    const collapsedWrapper = createComponent({ threadIsCollapsed: true });

    const expandedButton = expandedWrapper.find('button').getDOMNode();
    const collapsedButton = collapsedWrapper.find('button').getDOMNode();

    assert.equal(expandedButton.getAttribute('aria-expanded'), 'true');
    assert.equal(collapsedButton.getAttribute('aria-expanded'), 'false');
  });

  it('shows the reply count', () => {
    const wrapper = createComponent({ replyCount: 7 });
    assert.equal(wrapper.text(), 'Show replies (7)');
  });

  it('invokes the toggle callback when clicked', () => {
    const wrapper = createComponent();
    const button = wrapper.find('button');

    act(() => {
      button.props().onClick();
    });

    assert.calledOnce(fakeOnToggleReplies);
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'when collapsed',
        content: () => createComponent(),
      },
      {
        name: 'when expanded',
        content: () => createComponent({ threadIsCollapsed: false }),
      },
    ])
  );
});
