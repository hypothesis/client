import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { isPrivate } from '../util/permissions';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef {import('../../types/api').Group} Group
 */

/**
 * Render information about what group an annotation is in and
 * whether it is private to the current user (only me)
 */
function AnnotationShareInfo({ annotation }) {
  const group = useStore(store => store.getGroup(annotation.group));

  // Only show the name of the group and link to it if there is a
  // URL (link) returned by the API for this group. Some groups do not have links
  const linkToGroup = group?.links.html;

  const annotationIsPrivate = isPrivate(annotation.permissions);

  return (
    <div className="annotation-share-info u-layout-row--align-baseline">
      {group && linkToGroup && (
        <a
          className="u-layout-row--align-baseline u-color-text--muted"
          href={group.links.html}
          target="_blank"
          rel="noopener noreferrer"
        >
          {group.type === 'open' ? (
            <SvgIcon className="annotation-share-info__icon" name="public" />
          ) : (
            <SvgIcon className="annotation-share-info__icon" name="groups" />
          )}
          <span className="annotation-share-info__group-info">
            {group.name}
          </span>
        </a>
      )}
      {annotationIsPrivate && !linkToGroup && (
        <span className="u-layout-row--align-baseline u-color-text--muted">
          <span className="annotation-share-info__private-info">Only me</span>
        </span>
      )}
    </div>
  );
}

AnnotationShareInfo.propTypes = {
  /** The current annotation object for which sharing info will be rendered */
  annotation: propTypes.object.isRequired,
};

export default AnnotationShareInfo;
