'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useRef, useState } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const SvgIcon = require('./svg-icon');

/**
 * Component to edit annotation's tags.
 */
function TagEditor({ annotation, onEditTags, tags: tagsService, tagList }) {
  const inputEl = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Handle changes to this annotation's tags
   */
  const updateTags = tagList => {
    // update suggested-tags list via service
    tagsService.store(tagList.map(tag => ({ text: tag })));
    // invoke callback with updated tags
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
   * Adds a tag equal to the value of the input field, and
   * then clears out the suggestions list and the input field.
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
    setSuggestions([]);

    // clear the input field and maintain focus
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
  /**
   *  As the user types, change the suggestions query
   *  based on the value of inputEl.
   */
  const handleKeyUp = e => {
    // Helper to remove any repeated suggestions
    // that are already tags.
    const removeDuplicates = suggestions => {
      const suggestionsSet = [];
      suggestions.forEach(suggestion => {
        if (tagList.indexOf(suggestion) < 0) {
          suggestionsSet.push(suggestion);
        }
      });
      return suggestionsSet;
    };

    if (e.key && e.key !== 'Enter') {
      // A user typed a letter and we need to filter the results
      // to update the <dataset> suggestions
      const suggestions = removeDuplicates(
        tagsService.filter(inputEl.current.value)
      );
      setSuggestions(suggestions);
    } else if (e.type === 'keyup') {
      // Assume the user selected an option from <datalist>
      // either by clicking on it with the mouse or pressing
      // the 'Enter' key.
      addTag();
    }
  };

  const suggestionsList = (() => {
    const suggestionElements = suggestions.map((suggestion, index) => (
      <option key={index} value={suggestion} />
    ));

    // Only return a datalist if there is something to render in the list. This
    // avoid a bug in Firefox where the datalist rendered does not correspond to the
    // actual list of <option>s in the dom. Wiping out the entire <datalist> tag seems
    // to force Firefox's hand.
    if (suggestionElements.length > 0) {
      return (
        <datalist
          id={`tag-editor-datalist-${annotation.id}`}
          className="tag-editor__suggestions"
          aria-label="Annotation suggestions"
        >
          {suggestionElements}
        </datalist>
      );
    }
    return null;
  })();

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
        list={`tag-editor-datalist-${annotation.id}`}
        onBlur={handleKeyUp}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeyPress}
        ref={inputEl}
        placeholder="Add tags..."
        className="tag-editor__input"
        type="text"
      />
      {suggestionsList}
    </section>
  );
}

/**
 * @typedef Tag
 * @param tag {string} - The tag text
 */

TagEditor.propTypes = {
  /* Annotation that owns the tags. */
  annotation: propTypes.object.isRequired,

  /**
   *  Callback that saves the tag list.
   *
   *  @param {Array<Tag>} - Array of tags to save
   */
  onEditTags: propTypes.func.isRequired,

  /* The list of editable tags as strings. */
  tagList: propTypes.array.isRequired,

  /** Services */
  tags: propTypes.object,
  serviceUrl: propTypes.func,
};

TagEditor.injectedProps = ['serviceUrl', 'tags'];

module.exports = withServices(TagEditor);
