import { Link, GlobeIcon, GroupsIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { Group } from '../../../types/api';

export type AnnotationShareInfoProps = {
  /** Group to which the annotation belongs */
  group: Group;
  isPrivate: boolean;
};

/**
 * Render information about what group an annotation is in and
 * whether it is private to the current user (only me)
 *
 * @param {AnnotationShareInfoProps} props
 */
function AnnotationShareInfo({ group, isPrivate }: AnnotationShareInfoProps) {
  // Only show the name of the group and link to it if there is a
  // URL (link) returned by the API for this group. Some groups do not have links
  const linkToGroup = group?.links.html;

  return (
    <>
      {group && linkToGroup && (
        <Link
          // The light-text hover color is not a standard color for a Link, so
          // a custom variant is used
          classes={classnames(
            'text-color-text-light hover:text-color-text-light'
          )}
          href={group.links.html}
          target="_blank"
          underline="hover"
          variant="custom"
        >
          <div className="flex items-baseline gap-x-1">
            {group.type === 'open' ? (
              <GlobeIcon className="w-2.5 h-2.5" />
            ) : (
              <GroupsIcon className="w-2.5 h-2.5" />
            )}
            <span>{group.name}</span>
          </div>
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
