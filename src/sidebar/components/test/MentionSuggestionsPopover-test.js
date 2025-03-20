import { checkAccessibility, mount } from '@hypothesis/frontend-testing';
import { useRef } from 'preact/hooks';
import sinon from 'sinon';

import MentionSuggestionsPopover from '../MentionSuggestionsPopover';

describe('MentionSuggestionsPopover', () => {
  const defaultUsers = [
    { username: 'one', displayName: 'johndoe' },
    { username: 'two', displayName: 'johndoe' },
    { username: 'three', displayName: 'johndoe' },
  ];

  function TestComponent(props) {
    const anchorRef = useRef();
    return (
      <div>
        <div ref={anchorRef} />
        <MentionSuggestionsPopover {...props} anchorElementRef={anchorRef} />
      </div>
    );
  }

  function createComponent(props) {
    return mount(
      <TestComponent
        loadingUsers={false}
        users={defaultUsers}
        highlightedSuggestion={0}
        onSelectUser={sinon.stub()}
        mentionMode="username"
        {...props}
        open
      />,
      { connected: true },
    );
  }

  function suggestionAt(wrapper, index) {
    return wrapper.find('[role="option"]').at(index);
  }

  it('shows loading message when users are being loaded', () => {
    const wrapper = createComponent({ loadingUsers: true });
    assert.isTrue(
      wrapper.exists('[data-testid="suggestions-loading-indicator"]'),
    );
  });

  [
    { users: [], shouldRenderFallback: true },
    { users: defaultUsers, shouldRenderFallback: false },
  ].forEach(({ users, shouldRenderFallback }) => {
    it('shows fallback message when no users are provided', () => {
      const wrapper = createComponent({ users });
      assert.equal(
        wrapper.exists('[data-testid="suggestions-fallback"]'),
        shouldRenderFallback,
      );
      assert.isFalse(
        wrapper.exists('[data-testid="suggestions-loading-indicator"]'),
      );
    });
  });

  [
    { index: 0, expectedText: 'onejohndoe' },
    { index: 1, expectedText: 'twojohndoe' },
    { index: 2, expectedText: 'threejohndoe' },
  ].forEach(({ index, expectedText }) => {
    it('shows provided users as a list', () => {
      const wrapper = createComponent();
      assert.equal(suggestionAt(wrapper, index).text(), expectedText);
    });
  });

  [0, 1, 2].forEach(index => {
    it('highlights expected suggestion', () => {
      const wrapper = createComponent({ highlightedSuggestion: index });
      wrapper.find('[role="option"]').forEach((el, i) => {
        assert.equal(el.prop('aria-selected'), i === index);
      });
    });

    it('applies a suggestion when clicked', () => {
      const onSelectUser = sinon.stub();
      const wrapper = createComponent({ onSelectUser });

      suggestionAt(wrapper, index).simulate('click');

      assert.calledWith(onSelectUser, defaultUsers[index]);
    });

    it('sets suggestion as highlighted when hovering over it', () => {
      const onHighlightSuggestion = sinon.stub();
      const wrapper = createComponent({ onHighlightSuggestion });
      const hoverSuggestion = i =>
        wrapper.find('li').at(i).simulate('mousemove');

      hoverSuggestion(index);

      assert.calledWith(onHighlightSuggestion, index);
    });
  });

  [
    {
      mentionMode: 'username',
      shouldShowUsernames: true,
    },
    {
      mentionMode: 'display-name',
      shouldShowUsernames: false,
    },
  ].forEach(({ mentionMode, shouldShowUsernames }) => {
    it('renders expected suggestions according to mention mode', () => {
      const wrapper = createComponent({ mentionMode });

      assert.equal(
        wrapper.exists('[data-testid="username-one"]'),
        shouldShowUsernames,
      );
      assert.equal(
        wrapper.exists('[data-testid="username-two"]'),
        shouldShowUsernames,
      );
      assert.equal(
        wrapper.exists('[data-testid="username-three"]'),
        shouldShowUsernames,
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
