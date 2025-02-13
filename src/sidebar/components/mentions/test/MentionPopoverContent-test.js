import { formatDateTime } from '@hypothesis/frontend-shared';
import { checkAccessibility, mount } from '@hypothesis/frontend-testing';

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

  it('renders no display name nor description when not provided', () => {
    const wrapper = createComponent({ username: 'janedoe' });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.isFalse(wrapper.exists('[data-testid="display-name"]'));
    assert.isFalse(wrapper.exists('[data-testid="description"]'));
  });

  it('renders display name when provided', () => {
    const wrapper = createComponent({
      username: 'janedoe',
      display_name: 'Jane Doe',
    });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.equal(
      wrapper.find('[data-testid="display-name"]').text(),
      'Jane Doe',
    );
    assert.isFalse(wrapper.exists('[data-testid="description"]'));
  });

  it('renders description when provided', () => {
    const wrapper = createComponent({
      username: 'janedoe',
      description: 'This is my bio',
    });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.isFalse(wrapper.exists('[data-testid="display-name"]'));
    assert.equal(
      wrapper.find('[data-testid="description"]').text(),
      'This is my bio',
    );
  });

  it('renders both display name and description when provided', () => {
    const wrapper = createComponent({
      username: 'janedoe',
      display_name: 'Jane Doe',
      description: 'This is my bio',
    });

    assert.equal(wrapper.find('[data-testid="username"]').text(), '@janedoe');
    assert.equal(
      wrapper.find('[data-testid="display-name"]').text(),
      'Jane Doe',
    );
    assert.equal(
      wrapper.find('[data-testid="description"]').text(),
      'This is my bio',
    );
  });

  [
    '2025-01-23T15:36:52.100817+00:00',
    '2022-08-16T00:00:00.000000+00:00',
    '2008-02-29T13:00:00.000000+00:00',
  ].forEach(joined => {
    it('formats created date', () => {
      const wrapper = createComponent({ username: 'janedoe', joined });
      assert.equal(
        wrapper.find('[data-testid="created"]').text(),
        `Joined ${formatDateTime(joined, { includeTime: false })}`,
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'Invalid mention',
        content: () => createComponent('invalid'),
      },
      {
        name: 'Valid mention',
        content: () =>
          createComponent({
            username: 'janedoe',
            display_name: 'Jane Doe',
            description: 'This is my bio',
            created: '2025-01-23T15:36:52.100817+00:00',
          }),
      },
    ]),
  );
});
