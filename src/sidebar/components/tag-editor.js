import { createElement } from 'preact';
import { useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';

import AutocompleteList from './autocomplete-list';
import SvgIcon from './svg-icon';
import useElementShouldClose from './hooks/use-element-should-close';

// Global counter used to create a unique id for each instance of a TagEditor
let tagEditorIdCounter = 0;

/**
 * Component to edit annotation's tags.
 *
 * Component accessibility is modeled after "Combobox with Listbox Popup Examples" found here:
 * https://www.w3.org/TR/wai-aria-practices/examples/combobox/aria1.1pattern/listbox-combo.html
 */

function TagEditor({ onEditTags, tags: tagsService, tagList }) {
  const inputEl = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeItem, setActiveItem] = useState(-1); // -1 is unselected
  const [suggestionsListOpen, setSuggestionsListOpen] = useState(false);
  const [tagEditorId] = useState(() => {
    ++tagEditorIdCounter;
    return `tag-editor-${tagEditorIdCounter}`;
  });

  // Set up callback to monitor outside click events to close the AutocompleteList
  const closeWrapperRef = useRef();
  useElementShouldClose(closeWrapperRef, suggestionsListOpen, () => {
    setSuggestionsListOpen(false);
  });

  /**
   * Helper function that returns a list of suggestions less any
   * results also found from the duplicates list.
   *
   * @param {Array<string>} suggestions - Original list of suggestions
   * @param {Array<string>} duplicates - Items to be removed from the result
   * @return {Array<string>}
   */
  const removeDuplicates = (suggestions, duplicates) => {
    const suggestionsSet = [];
    suggestions.forEach(suggestion => {
      if (duplicates.indexOf(suggestion) < 0) {
        suggestionsSet.push(suggestion);
      }
    });
    return suggestionsSet.sort();
  };

  /**
   * Get a list of suggestions returned from the tagsService
   * reset the activeItem and open the AutocompleteList
   */
  const updateSuggestions = () => {
    const value = inputEl.current.value.trim();
    if (value === '') {
      // If there is no input, just hide the suggestions
      setSuggestionsListOpen(false);
    } else {
      // Call filter() with a query value to return all matching suggestions.
      const suggestions = tagsService.filter(value);
      // Remove any repeated suggestions that are already tags
      // and set those to state.
      setSuggestions(removeDuplicates(suggestions, tagList));
      setSuggestionsListOpen(true);
    }
    setActiveItem(-1);
  };

  /**
   * Handle changes to this annotation's tags
   */
  const updateTags = tagList => {
    // update suggested tags list via service
    tagsService.store(tagList.map(tag => ({ text: tag })));
    onEditTags({ tags: tagList });
  };

  /**
   * Remove a tag from this annotation.
   *
   * @param {string} tag
   */
  const removeTag = tag => {
    const newTagList = [...tagList]; // make a copy
    const index = newTagList.indexOf(tag);
    newTagList.splice(index, 1);
    updateTags(newTagList);
  };

  /**
   * Adds a tag to the annotation equal to the value of the input field
   * and then clears out the suggestions list and the input field.
   */
  const addTag = newTag => {
    const value = newTag.trim();
    if (value.length === 0) {
      // don't add an empty tag
      return;
    }
    if (tagList.indexOf(value) >= 0) {
      // don't add duplicate tag
      return;
    }
    updateTags([...tagList, value]);
    setSuggestionsListOpen(false);
    setActiveItem(-1);

    inputEl.current.value = '';
    inputEl.current.focus();
  };

  /**
   *  Update the suggestions if the user changes the value of the input
   */
  const handleOnInput = e => {
    if (
      e.inputType === 'insertText' ||
      e.inputType === 'deleteContentBackward'
    ) {
      updateSuggestions();
    }
  };

  /**
   *  Callback when the user clicked one of the items in the suggestions list.
   *  This will add a new tag.
   */
  const handleSelect = item => {
    if (item) {
      addTag(item);
    }
  };

  /**
   * Opens the AutocompleteList on focus if there is a value in the input
   */
  const handleFocus = () => {
    if (inputEl.current.value.trim().length) {
      setSuggestionsListOpen(true);
    }
  };

  /**
   *  Called when the user uses keyboard navigation to move
   *  up or down the suggestions list creating a highlighted
   *  item.
   *
   *  The first value in the list is an unselected value (-1).
   *  A user can arrive at this value by pressing the up arrow back to
   *  the beginning or the down arrow until the end.
   *
   * @param {number} direction - Pass 1 for the next item or -1 for the previous
   */
  const changeSelectedItem = direction => {
    let nextActiveItem = activeItem + direction;
    if (nextActiveItem < -1) {
      nextActiveItem = suggestions.length - 1;
    } else if (nextActiveItem >= suggestions.length) {
      nextActiveItem = -1;
    }
    setActiveItem(nextActiveItem);
  };

  /**
   * Keydown handler for keyboard navigation of the suggestions list
   * and when the user presses "Enter" or ","" to add a new typed item not
   * found in the suggestions list
   */
  const handleKeyDown = e => {
    switch (e.key) {
      case 'ArrowUp':
        changeSelectedItem(-1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        changeSelectedItem(1);
        e.preventDefault();
        break;
      case 'Enter':
      case ',':
        if (activeItem === -1) {
          // nothing selected, just add the typed text
          addTag(inputEl.current.value);
        } else {
          addTag(suggestions[activeItem]);
        }
        e.preventDefault();
        break;
      case 'Tab':
        if (activeItem === -1) {
          // allow tab key to add tag, but only if the <input> value
          // matches a suggestion from the list
          if (suggestions.indexOf(inputEl.current.value) > -1) {
            addTag(inputEl.current.value);
            e.preventDefault();
          }
        }
    }
  };

  // The activedescendant prop should match the activeItem's value except
  // when its -1 (no item selected), and in this case set the activeDescendant to "".
  const activeDescendant =
    activeItem >= 0
      ? `${tagEditorId}-autocomplete-list-item-${activeItem}`
      : '';

  return (
    <section className="tag-editor">
      <ul
        className="tag-editor__tags"
        aria-label="Suggested tags for annotation"
      >
        {tagList.map(tag => {
          return (
            <li
              key={`${tag}`}
              className="tag-editor__item"
              aria-label={`Tag: ${tag}`}
            >
              <span lang="" className="tag-editor__edit">
                {tag}
              </span>
              <button
                onClick={() => {
                  removeTag(tag);
                }}
                title={`Remove Tag: ${tag}`}
                className="tag-editor__delete"
              >
                <SvgIcon name="cancel" />
              </button>
            </li>
          );
        })}
      </ul>
      <span
        id={tagEditorId}
        className="tag-editor__combobox-wrapper"
        ref={closeWrapperRef}
        // Disabled because aria-controls must be attached to the <input> field
        // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
        role="combobox"
        aria-expanded={suggestionsListOpen.toString()}
        aria-owns={`${tagEditorId}-autocomplete-list`}
        aria-haspopup="listbox"
      >
        <input
          onInput={handleOnInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          ref={inputEl}
          placeholder="Add new tags"
          className="tag-editor__input"
          type="text"
          autoComplete="off"
          aria-label="Add tag field"
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-controls={`${tagEditorId}-autocomplete-list`}
          dir="auto"
        />
        <AutocompleteList
          id={`${tagEditorId}-autocomplete-list`}
          list={suggestions}
          open={suggestionsListOpen}
          onSelectItem={handleSelect}
          itemPrefixId={`${tagEditorId}-autocomplete-list-item-`}
          activeItem={activeItem}
        />
      </span>
    </section>
  );
}

/**
 * @typedef Tag
 * @param tag {string} - The tag text
 */

TagEditor.propTypes = {
  /**
   *  Callback that saves the tag list.
   *
   *  @param {Array<Tag>} - Array of tags to save
   */
  onEditTags: propTypes.func.isRequired,

  /* The list of editable tags as strings. */
  tagList: propTypes.array.isRequired,

  /** Services */
  tags: propTypes.object.isRequired,
  serviceUrl: propTypes.func.isRequired,
};

TagEditor.injectedProps = ['serviceUrl', 'tags'];

export default withServices(TagEditor);
