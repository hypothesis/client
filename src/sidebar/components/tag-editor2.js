'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useRef, useState } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const SvgIcon = require('./svg-icon');

/**
 * Component to edit annotation tags. Tags may be added or removed from any
 * given annotation. This component also renders suggested tags which use
 * the `tags` service to set or get previously used tags to
 * local storage.
 */
function TagEditor2({ annotation, onEditTags, tags: tagsService, tagList }) {
  const inputEl = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Passes the tags list to the provided callback `onEditTags` so it may
   * be saved to the service. Also passes the list to `tagsService.store`
   * so it may be presented as a future suggestion if its not already
   * one.
   *
   * @param {Array<string>} tagList
   */
  const saveTags = tagList => {
    // save suggested tags
    tagsService.store(tagList.map(tag => ({ text: tag })));
    // set the new tag to the annotation
    onEditTags({ tags: tagList });
  };

  /**
   * Remove a tag.
   *
   * @param {string} tag
   */
  const removeTag = tag => {
    const newTagList = [...tagList]; // make a copy
    const index = newTagList.indexOf(tag);
    newTagList.splice(index, 1);
    saveTags(newTagList);
  };

  /**
   * Adds a new local tag equal to the value of the input field only
   * if its not already in the `tagList`.
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
    setSuggestions([]);
    saveTags([...tagList, value]);

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

  const buildSuggestionsList = () => {
    const suggestionElements = suggestions.map((suggestion, index) => (
      <option key={index} value={suggestion} />
    ));
    return (
      <datalist
        id={`tag-editor-datalist-${annotation.id}`}
        className="tag-editor__suggestions"
        aria-label="Annotation suggestions"
      >
        {suggestionElements}
      </datalist>
    );
  };

  return (
    <section className="tag-editor">
      <ul className="tag-editor__tag-list" aria-label="Annotation tags">
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
      {buildSuggestionsList()}
    </section>
  );
}

/**
 * @typedef Tag
 * @param tag {string} - The tag text
 */

TagEditor2.propTypes = {
  /* Annotation that owns the tags. */
  annotation: propTypes.object,

  /**
   *  Callback that saves the tag list.
   *
   *  @param {Array<Tag>} - Array of tags to save
   */
  onEditTags: propTypes.func,

  /* The list of editable tags as strings. */
  tagList: propTypes.array,

  /** Services */
  tags: propTypes.object,
  serviceUrl: propTypes.func,
};

TagEditor2.injectedProps = ['serviceUrl', 'tags'];

module.exports = withServices(TagEditor2);
