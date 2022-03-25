import { Icon, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * @typedef {import("../../../types/api").Group} Group
 */

/**
 * @typedef AnnotationShareInfoProps
 * @prop {Group} group - Group to which the annotation belongs
 * @prop {boolean} isPrivate
 */

/**
 * Render information about what group an annotation is in and
 * whether it is private to the current user (only me)
 *
 * @param {AnnotationShareInfoProps} props
 */
function AnnotationShareInfo({ group, isPrivate }) {
  // Only show the name of the group and link to it if there is a
  // URL (link) returned by the API for this group. Some groups do not have links
  const linkToGroup = group?.links.html;

  return (
    <>
      {group && linkToGroup && (
        <Link
          classes={classnames(
            'flex items-baseline gap-x-1',
            'text-color-text-light hover:text-color-text-light hover:underline'
          )}
          href={group.links.html}
          target="_blank"
        >
          <Icon
            classes="text-tiny"
            name={group.type === 'open' ? 'public' : 'groups'}
          />
          <span>{group.name}</span>
        </Link>
      )}
      {isPrivate && !linkToGroup && (
        <div className="text-color-text-light" data-testid="private-info">
          Only me
        </div>
      )}
    </>
  );
}

export default AnnotationShareInfo;
