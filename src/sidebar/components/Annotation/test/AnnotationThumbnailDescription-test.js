import { mount } from '@hypothesis/frontend-testing';

import AnnotationThumbnailDescription from '../AnnotationThumbnailDescription';

describe('AnnotationThumbnailDescription', () => {
  it('displays current description', () => {
    const wrapper = mount(
      <AnnotationThumbnailDescription description="foo bar" />,
      // Needed for popover to work
      { connected: true },
    );
    assert.equal(wrapper.find('input').getDOMNode().value, 'foo bar');
  });

  it('invokes `onEdit` when description is changed', () => {
    const onEdit = sinon.stub();
    const wrapper = mount(
      <AnnotationThumbnailDescription description="foo bar" onEdit={onEdit} />,
      { connected: true },
    );
    const input = wrapper.find('input');
    input.getDOMNode().value = 'new description';

    input.simulate('input');

    assert.calledWith(onEdit, 'new description');
  });

  it('displays alt-text info popover when info button is clicked', () => {
    const wrapper = mount(
      <AnnotationThumbnailDescription description="foo bar" />,
      { connected: true },
    );
    assert.isFalse(wrapper.find('Popover').prop('open'));

    wrapper.find('button').simulate('click');
    assert.isTrue(wrapper.find('Popover').prop('open'));

    wrapper.find('Popover').prop('onClose')();
    wrapper.update();
    assert.isFalse(wrapper.find('Popover').prop('open'));
  });
});
