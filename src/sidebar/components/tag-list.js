import { createElement } from 'preact';
import { useMemo } from 'preact/hooks';
import propTypes from 'prop-types';

import { isThirdPartyUser } from '../util/account-id';
import { withServices } from '../util/service-context';

/** @typedef {import('../../types/api').Annotation} Annotation */

/**
 * @typedef TagListProps
 * @prop {Annotation} annotation - Annotation that owns the tags.
 * @prop {string[]} tags - List of tags as strings.
 * @prop {(a: string, b: Object<'tag', string>) => any} serviceUrl - Services
 * @prop {{ authDomain: string }} settings
 */

/**
 * Component to render an annotation's tags.
 * @param {TagListProps} props
 */
function TagList({ annotation, serviceUrl, settings, tags }) {
  const renderLink = useMemo(
    // Show a link if the authority of the user is not 3rd party
    () => !isThirdPartyUser(annotation.user, settings.authDomain),
    [annotation, settings]
  );

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
              lang=""
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Tag: ${tag}`}
              title={`View annotations with tag: ${tag}`}
            >
              {tag}
            </a>
          )}
          {!renderLink && (
            <span className="tag-list__text" aria-label={`Tag: ${tag}`} lang="">
              {tag}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

TagList.propTypes = {
  annotation: propTypes.object.isRequired,
  tags: propTypes.array.isRequired,
  serviceUrl: propTypes.func,
  settings: propTypes.object,
};

TagList.injectedProps = ['serviceUrl', 'settings'];

export default withServices(TagList);
