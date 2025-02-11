import { mount } from '@hypothesis/frontend-testing';

import MentionPopoverContent from '../MentionPopoverContent';

describe('MentionPopoverContent', () => {
  function createComponent(content) {
    return mount(<MentionPopoverContent content={content} />);
  }

  it('renders user-not-found message when InvalidUser is provided', () => {
    const wrapper = createComponent('@invalid');

    assert.equal('No user with username @invalid exists', wrapper.text());
    assert.isFalse(wrapper.exists('[data-testid="username"]'));
    assert.isFalse(wrapper.exists('[data-testid="display-name"]'));
  });

  it('renders username when valid mention without display name is provided', () => {
    const wrapper = createComponent({ username: 'janedoe' });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.isFalse(wrapper.exists('[data-testid="display-name"]'));
  });

  it('renders username and display name when valid mention with display name is provided', () => {
    const wrapper = createComponent({
      username: 'janedoe',
      display_name: 'Jane Doe',
    });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.equal(
      wrapper.find('[data-testid="display-name"]').text(),
      'Jane Doe',
    );
  });
});
