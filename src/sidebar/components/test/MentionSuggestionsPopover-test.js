import { mount } from '@hypothesis/frontend-testing';
import { useRef } from 'preact/hooks';
import sinon from 'sinon';

import MentionSuggestionsPopover from '../MentionSuggestionsPopover';

describe('MentionSuggestionsPopover', () => {
  const defaultSuggestions = [
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
        suggestions={defaultSuggestions}
        highlightedSuggestion={0}
        onSelectSuggestion={sinon.stub()}
        {...props}
        open
      />,
      { connected: true },
    );
  }

  function suggestionAt(wrapper, index) {
    return wrapper.find('[role="option"]').at(index);
  }

  [
    { suggestions: [], shouldRenderFallback: true },
    { suggestions: defaultSuggestions, shouldRenderFallback: false },
  ].forEach(({ suggestions, shouldRenderFallback }) => {
    it('shows fallback message when no suggestions are provided', () => {
      const wrapper = createComponent({ suggestions });
      assert.equal(
        wrapper.exists('[data-testid="suggestions-fallback"]'),
        shouldRenderFallback,
      );
    });
  });

  [
    { index: 0, expectedText: 'onejohndoe' },
    { index: 1, expectedText: 'twojohndoe' },
    { index: 2, expectedText: 'threejohndoe' },
  ].forEach(({ index, expectedText }) => {
    it('shows provided suggestions as a list', () => {
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
      const onSelectSuggestion = sinon.stub();
      const wrapper = createComponent({ onSelectSuggestion });

      suggestionAt(wrapper, index).simulate('click');

      assert.calledWith(onSelectSuggestion, defaultSuggestions[index]);
    });
  });
});