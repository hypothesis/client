'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');
const { useEffect, useState } = require('preact/hooks');

const { isThirdPartyUser } = require('../util/account-id');
const { withServices } = require('../util/service-context');

/**
 * Component to render an annotation's tags.
 */
function TagList({ annotation, serviceUrl, settings, tags }) {
  // Should we show a linked tag or just a text tag?
  const [renderLink, setRenderLink] = useState(false);

  useEffect(() => {
    // Show a link if the authority of the user is not 3rd party
    setRenderLink(!isThirdPartyUser(annotation.user, settings.authDomain));
  }, [annotation, settings]);

  /**
   * Returns a uri link for a specific tag name.
   * @param {string} tag
   * @return {string}
   */
  const createTagSearchURL = tag => {
    return serviceUrl('search.tag', { tag: tag });
  };

  return (
    <ul className="tag-list" aria-label="Annotation tags">
      {tags.map(tag => (
        <li key={tag} className="tag-list__item">
          {renderLink && (
            <a
              className="tag-list__link"
              href={createTagSearchURL(tag)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Tag: ${tag}`}
              title={`View annotations with tag: ${tag}`}
            >
              {tag}
            </a>
          )}
          {!renderLink && (
            <span className="tag-list__text" aria-label={`Tag: ${tag}`}>
              {tag}
            </span>
          )}
        </li>
      ))}
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
  serviceUrl: propTypes.func,
  settings: propTypes.object,
};

TagList.injectedProps = ['serviceUrl', 'settings'];

module.exports = withServices(TagList);
