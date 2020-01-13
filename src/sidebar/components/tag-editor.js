import { createElement } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';

import SvgIcon from './svg-icon';

// Global counter used to create a unique id for each instance of a TagEditor
let datalistIdCounter = 0;

/**
 * Component to edit annotation's tags.
 */

function TagEditor({ onEditTags, tags: tagsService, tagList }) {
  const inputEl = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsFiltered, setSuggestionsFiltered] = useState([]); // For Chrome only
  const [datalistId] = useState(() => {
    ++datalistIdCounter;
    return `tag-editor-datalist-${datalistIdCounter}`;
  });

  const isChromeUA = !!window.navigator.userAgent.match(/Chrome\/[.0-9]*/);
  // Suggestion limiter to speed up the performance in Chrome
  // See https://github.com/hypothesis/client/issues/1606
  const chromeSuggestionsLimit = 20;

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

  // List of suggestions returned from the tagsService
  const suggestions = useMemo(() => {
    // Remove any repeated suggestions that are already tags.
    // Call filter with an empty string to return all suggestions
    return removeDuplicates(tagsService.filter(''), tagList);
  }, [tagsService, tagList]);

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
  const addTag = () => {
    const value = inputEl.current.value.trim();
    if (value.length === 0) {
      // don't add an empty tag
      return;
    }
    if (tagList.indexOf(value) >= 0) {
      // don't add duplicate tag
      return;
    }
    updateTags([...tagList, value]);
    setShowSuggestions(false);

    inputEl.current.value = '';
    inputEl.current.focus();
  };

  /**
   *  If the user pressed enter or comma while focused on
   *  the <input>, then add a new tag.
   */
  const handleKeyPress = e => {
    if (e.key === 'Enter' || e.key === ',') {
      addTag();
      // preventDefault stops the delimiter from being
      // added to the input field
      e.preventDefault();
    }
  };

  const handleOnInput = e => {
    if (
      e.inputType === 'insertText' ||
      e.inputType === 'deleteContentBackward'
    ) {
      if (inputEl.current.value.length === 0) {
        // If the user deleted input, hide suggestions. This has
        // no effect in Safari and the list will stay open.
        setShowSuggestions(false);
      } else {
        if (isChromeUA) {
          // Filter down the suggestions list for Chrome to subvert a performance
          // issue. Returning too many suggestions causes a noticeable delay when
          // rendering the datalist.
          // See https://github.com/hypothesis/client/issues/1606
          setSuggestionsFiltered(
            removeDuplicates(
              tagsService.filter(inputEl.current.value, chromeSuggestionsLimit),
              tagList
            )
          );
        }
        // Show the suggestions if the user types something into the field
        setShowSuggestions(true);
      }
    } else if (
      e.inputType === undefined ||
      e.inputType === 'insertReplacementText'
    ) {
      // nb. Chrome / Safari reports undefined and Firefox reports 'insertReplacementText'
      // for the inputTyp value when clicking on an element in the datalist.
      //
      // There are two ways to arrive here, either click an item with the mouse
      // or use keyboard navigation and press 'Enter'.
      //
      // If the input value typed already exactly matches the option selected
      // then this event won't fire and a user would have to press 'Enter' a second
      // time to trigger the handleKeyPress callback above to add the tag.
      // Bug: https://github.com/hypothesis/client/issues/1604
      addTag();
    }
  };

  const handleKeyUp = e => {
    // Safari on macOS and iOS have an issue where pressing "Enter" in an
    // input when its value exactly matches a suggestion in the associated <datalist>
    // does not generate a "keypress" event. Therefore we catch the subsequent
    // "keyup" event instead.

    if (e.key === 'Enter') {
      // nb. `addTag` will do nothing if the "keypress" event was already handled.
      addTag();
    }
  };

  const suggestionsList = () => {
    // If this is Chrome, use the filtered list, otherwise use the full list
    // See https://github.com/hypothesis/client/issues/1606
    const optionsList = isChromeUA ? suggestionsFiltered : suggestions;
    return (
      <datalist
        id={datalistId}
        className="tag-editor__suggestions"
        aria-label="Annotation suggestions"
      >
        {showSuggestions &&
          optionsList.map(suggestion => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    );
  };

  return (
    <section className="tag-editor">
      <ul
        className="tag-editor__tag-list"
        aria-label="Suggested tags for annotation"
      >
        {tagList.map(tag => {
          return (
            <li
              key={`${tag}`}
              className="tag-editor__tag-item"
              aria-label={`Tag: ${tag}`}
            >
              <span className="tag-editor__edit">{tag}</span>
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
      <input
        list={datalistId}
        onInput={handleOnInput}
        onKeyPress={handleKeyPress}
        onKeyUp={handleKeyUp}
        ref={inputEl}
        placeholder="Add tags..."
        className="tag-editor__input"
        type="text"
      />
      {suggestionsList()}
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
