import { act } from 'preact/test-utils';
import { mount } from 'enzyme';

import NotebookModal from '../NotebookModal';

describe('NotebookModal', () => {
  let components;

  const createComponent = ({
    open = false,
    groupId = null,
    config,
    onClose = sinon.stub(),
  } = {}) => {
    const component = mount(
      <NotebookModal
        open={open}
        groupId={groupId}
        config={{ notebookAppUrl: '/notebook', ...config }}
        onClose={onClose}
      />
    );
    components.push(component);
    return component;
  };

  beforeEach(() => {
    components = [];
  });

  afterEach(() => {
    components.forEach(component => component.unmount());
  });

  it('does not create modal container if no group ID is set', () => {
    const wrapper = createComponent();
    const outer = wrapper.find('.NotebookModal__outer');

    assert.isFalse(outer.exists());
  });

  it('hides modal if a group ID is set but `open` is false', () => {
    const wrapper = createComponent({ groupId: '1' });
    const outer = wrapper.find('.NotebookModal__outer');
    assert.isTrue(outer.hasClass('is-hidden'));
  });

  it('shows modal when `open` is true and a group ID is set', () => {
    const wrapper = createComponent({ open: true, groupId: 'myGroup' });
    const outer = wrapper.find('.NotebookModal__outer');

    assert.isFalse(outer.hasClass('is-hidden'));

    const iframe = wrapper.find('iframe');
    assert.equal(
      iframe.prop('src'),
      `/notebook#config=${encodeURIComponent('{"group":"myGroup"}')}`
    );
  });

  it('creates a new iframe element when the notebook is re-opened', () => {
    const wrapper = createComponent({ open: true, groupId: '1' });

    const iframe1 = wrapper.find('iframe');
    assert.equal(
      iframe1.prop('src'),
      `/notebook#config=${encodeURIComponent('{"group":"1"}')}`
    );

    wrapper.setProps({ open: false });
    wrapper.setProps({ open: true });

    const iframe2 = wrapper.find('iframe');
    assert.equal(
      iframe2.prop('src'),
      `/notebook#config=${encodeURIComponent('{"group":"1"}')}`
    );
    assert.notEqual(iframe1.getDOMNode(), iframe2.getDOMNode());

    wrapper.setProps({ open: true, groupId: '2' });

    const iframe3 = wrapper.find('iframe');
    assert.equal(
      iframe3.prop('src'),
      `/notebook#config=${encodeURIComponent('{"group":"2"}')}`
    );
    assert.notEqual(iframe1.getDOMNode(), iframe3.getDOMNode());
  });

  it('makes the document unscrollable when modal is open', () => {
    createComponent({ open: true, groupId: 'myGroup' });
    assert.equal(document.body.style.overflow, 'hidden');
  });

  it('invokes `onClose` prop when modal is closed', () => {
    const onClose = sinon.stub();
    const wrapper = createComponent({
      open: true,
      groupId: 'myGroup',
      onClose,
    });

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });

    assert.called(onClose);
  });

  it('hides modal on closing', () => {
    const wrapper = createComponent({ open: true, groupId: 'myGroup' });

    let outer = wrapper.find('.NotebookModal__outer');
    assert.isFalse(outer.hasClass('is-hidden'));

    wrapper.setProps({ open: false });

    outer = wrapper.find('.NotebookModal__outer');
    assert.isTrue(outer.hasClass('is-hidden'));
  });

  it('resets document scrollability when modal is closed', () => {
    const wrapper = createComponent({ open: true, groupId: 'myGroup' });
    assert.equal(document.body.style.overflow, 'hidden');

    wrapper.setProps({ open: false });

    assert.notEqual(document.body.style.overflow, 'hidden');
  });
});
