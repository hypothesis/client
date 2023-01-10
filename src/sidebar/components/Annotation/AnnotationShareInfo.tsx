import {
  LinkBase,
  GlobeIcon,
  GroupsIcon,
} from '@hypothesis/frontend-shared/lib/next';
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
        <LinkBase
          // The light-text hover color is not a standard color for a Link, so
          // LinkBase is used here
          classes={classnames(
            'flex items-baseline gap-x-1',
            'text-color-text-light hover:text-color-text-light hover:underline'
          )}
          href={group.links.html}
          target="_blank"
        >
          {group.type === 'open' ? (
            <GlobeIcon className="w-2.5 h-2.5" />
          ) : (
            <GroupsIcon className="w-2.5 h-2.5" />
          )}
          <span>{group.name}</span>
        </LinkBase>
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
