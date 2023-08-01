import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import TagList from '../TagList';
import TagListItem from '../TagListItem';

describe('TagListItem', () => {
  const createComponent = props =>
    mount(<TagListItem tag="my tag" {...props} />);

  // Render TagListItems in a list to appease semantic requirements of
  // a11y tests
  const createComponentInList = () =>
    mount(
      <TagList>
        <TagListItem tag="my tag" href="http://www.example.com/my-tag" />
        <TagListItem tag="purple" />
      </TagList>,
    );

  it('renders the tag text', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.text(), 'my tag');
  });

  it('links the tag to the provided `href`', () => {
    const wrapper = createComponent({ href: 'http:www.example.com/my-tag' });
    const link = wrapper.find('Link');
    assert.equal(link.props().href, 'http:www.example.com/my-tag');
  });

  it('renders a delete button if a removal callback is provided', () => {
    const onRemoveTag = sinon.stub();
    const wrapper = createComponent({ tag: 'banana', onRemoveTag });

    assert.isTrue(wrapper.find('button[title="Remove tag: banana"]').exists());
  });

  it('invokes the removal callback when the delete button is clicked', () => {
    const onRemoveTag = sinon.stub();
    const wrapper = createComponent({ onRemoveTag });

    wrapper.find('button').simulate('click');
    assert.calledOnce(onRemoveTag);
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponentInList(),
    }),
  );
});
