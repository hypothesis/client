'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const { isThirdPartyUser } = require('../util/account-id');
const { withServices } = require('../util/service-context');

/**
 * Component to render an annotation's tags.
 */
function TagList({ annotation, serviceUrl, settings, tags }) {
  /**
   * Builds a uri link for a specific tag name.
   * @param {string} tag
   */
  const createTagSearchURL = tag => {
    if (isThirdPartyUser(annotation.user, settings.authDomain)) {
      return null;
    }
    return serviceUrl('search.tag', { tag: tag });
  };

  const tagElements = tags.map(tag => (
    <li key={`${tag}`} className="tag-list__item">
      <a
        className="tag-list__link"
        href={createTagSearchURL(tag)}
        target="_blank"
        aria-label={`Tag: ${tag}`}
        rel="noopener noreferrer"
      >
        {tag}
      </a>
    </li>
  ));

  return (
    <ul className="tag-list" aria-label="Annotation tags">
      {tagElements}
    </ul>
  );
}

/**
 * @typedef Tag
 * @param tag {string} - The tag text
 */

TagList.propTypes = {
  /* Annotation that owns the tags. */
  annotation: propTypes.object,

  /* List of tags as strings. */
  tags: propTypes.array,

  /** Services */
  settings: propTypes.object,
  serviceUrl: propTypes.func,
};

TagList.injectedProps = ['serviceUrl', 'settings'];

module.exports = withServices(TagList);
