'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useRef, useState } = require('preact/hooks');

const { withServices } = require('../util/service-context');
const SvgIcon = require('./svg-icon');

/**
 * Component to both render and edit annotation tags. Tags may be added or
 * removed from any given annotation. This component also renders suggested
 * tags which use  the `tags` service to set or get previously used tags to
 * local storage.
 */
function TagEditor2({
  id,
  editMode,
  isThirdParty,
  onEditTags,
  serviceUrl,
  tags: tagsService,
  tagList,
}) {
  const inputEl = useRef(null);
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Builds a uri link for a specific tag name.
   * @param {string} tag
   */
  const createTagSearchURL = tag => {
    if (isThirdParty) {
      return null;
    }
    return serviceUrl('search.tag', { tag: tag });
  };

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
  const deleteTag = tag => {
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
   *  If the user pressed enter or comma, add a new tag.
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
      const queryList = tagsService.filter(inputEl.current.value);
      const querySet = [];
      // create a set with no duplicates
      for (let i = 0; i < queryList.length; i++) {
        if (tagList.indexOf(queryList[i]) < 0) {
          querySet.push(queryList[i]);
        }
      }
      setSuggestions(querySet);
    } else if (e.type === 'keyup') {
      // assume the user selected an option from datalist
      addTag();
    }
  };

  const buildTagItem = tag => {
    if (editMode) {
      return (
        <li key={`${tag}`} className="tag-editor__tag-item" aria-label={`Tag: ${tag}`}>
          <span className="tag-editor__edit">{tag}</span>
          <button
            onClick={deleteTag.bind(this, tag)}
            title="Delete tag from this annotation"
            className="tag-editor__delete"
          >
            <SvgIcon name="cancel" />
          </button>
        </li>
      );
    } else {
      return (
        <li 
        key={`${tag}`} className="tag-editor__tag-item" aria-label={`Tag: ${tag}`}>
          <a
            className="tag-editor__link"
            href={createTagSearchURL(tag)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tag}
          </a>
        </li>
      );
    }
  };

  const buildTagList = () => {
    const tagElements = tagList.map(buildTagItem)
    return (
      <ul className="tag-editor__tag-list" aria-label="Annotation tags">
        {tagElements}
      </ul>
    );
  };

  const buildSuggestionsList = () => {
    const suggestionElements = suggestions.map((suggestion, index) => 
      (<option key={index} value={suggestion} />)
    );
    return (
      <datalist
        id={`tag-editor-datalist-${id}`}
        className="tag-editor__suggestions"
        aria-label="Annotation suggestions"
      >
        {suggestionElements}
      </datalist>
    );
  };

  return (
    <section className="TagEditor">
      {buildTagList()}
      {editMode && (
        <input
          list={`tag-editor-datalist-${id}`}
          onBlur={handleKeyUp}
          onKeyUp={handleKeyUp}
          onKeyPress={handleKeyPress}
          ref={inputEl}
          placeholder="Add tags..."
          className="tag-editor__input"
          type="text"
        />
      )}
      {buildSuggestionsList()}
    </section>
  );
}

/**
 * @typedef Tag
 * @param tag {string} - The tag text
 */

TagEditor2.propTypes = {
  /* Parent annotation's unique id. */
  id: propTypes.string,

  /* Is this a hypothesis client or not? */
  isThirdParty: propTypes.bool,

  /* Either editing the tags, or viewing the tags. */
  editMode: propTypes.bool,
  /**
   *  Callback that saves the tag list.
   *
   *  @param {Array<Tag>} - Array of tags to save
   */
  onEditTags: propTypes.func,

  /* List of tags as strings. */
  tagList: propTypes.array,

  /** Services */
  tags: propTypes.object,
  serviceUrl: propTypes.func,
};

TagEditor2.injectedProps = ['serviceUrl', 'tags'];

module.exports = withServices(TagEditor2);
