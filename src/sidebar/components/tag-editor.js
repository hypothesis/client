'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useMemo, useRef, useState } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const SvgIcon = require('./svg-icon');

/**
 * Component to edit annotation's tags.
 */
function TagEditor({ annotation, onEditTags, tags: tagsService, tagList }) {
  const inputEl = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // List of suggestions returned from the tagsService
  const suggestions = useMemo(() => {
    // Remove any repeated suggestions that are already tags.
    const removeDuplicates = (suggestions, tags) => {
      const suggestionsSet = [];
      suggestions.forEach(suggestion => {
        if (tags.indexOf(suggestion) < 0) {
          suggestionsSet.push(suggestion);
        }
      });
      return suggestionsSet;
    };
    // Call filter with an empty string to return all suggestions
    return removeDuplicates(tagsService.filter(''), tagList);
  }, [tagsService, tagList]);

  /**
   * Handle changes to this annotation's tags
   */
  const updateTags = tagList => {
    // update suggested tags list via service
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
    if (e.key) {
      // Show the suggestions if the user types anything
      setShowSuggestions(true);
    } else if (e.type === 'keyup') {
      // Assume the user selected an option from <datalist>
      // either by clicking on it with the mouse or pressing
      // the 'Enter' key.
      addTag();
    }
  };

  const suggestionsList = () => {
    return (
      <datalist
        id={`tag-editor-datalist-${annotation.id}`}
        className="tag-editor__suggestions"
        aria-label="Annotation suggestions"
      >
        {' '}
        {suggestions.map((suggestion, index) => (
          <option key={index} value={suggestion} />
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
        list={`tag-editor-datalist-${annotation.id}`}
        onKeyUp={handleKeyUp}
        onKeyPress={handleKeyPress}
        ref={inputEl}
        placeholder="Add tags..."
        className="tag-editor__input"
        type="text"
      />
      {showSuggestions && suggestionsList()}
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
  tags: propTypes.object.isRequired,
  serviceUrl: propTypes.func.isRequired,
};

TagEditor.injectedProps = ['serviceUrl', 'tags'];

module.exports = withServices(TagEditor);
