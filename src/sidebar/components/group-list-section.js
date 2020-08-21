import { createElement } from 'preact';
import propTypes from 'prop-types';

import GroupListItem from './group-list-item';
import MenuSection from './menu-section';

/**
 * @typedef {import('../../types/api').Group} Group
 */

/**
 * @typedef GroupListSectionProps
 * @prop {Group|null} [expandedGroup]
 *  - The `Group` whose submenu is currently expanded, or `null` if no group is currently expanded
 * @prop {Group[]} groups - The list of groups to be displayed in the group list section
 * @prop {string} [heading] - The string name of the group list section
 * @prop {(group: Group|null) => any} onExpandGroup -
 *   Callback invoked when a group is expanded or collapsed.  The argument is the group being
 *   expanded, or `null` if the expanded group is being collapsed.
 */

/**
 * A labeled section of the groups list.
 *
 * @param {GroupListSectionProps} props
 */
export default function GroupListSection({
  expandedGroup,
  onExpandGroup,
  groups,
  heading,
}) {
  return (
    <MenuSection heading={heading}>
      {groups.map(group => (
        <GroupListItem
          key={group.id}
          isExpanded={group === expandedGroup}
          onExpand={expanded => onExpandGroup(expanded ? group : null)}
          group={group}
        />
      ))}
    </MenuSection>
  );
}

GroupListSection.propTypes = {
  expandedGroup: propTypes.object,
  groups: propTypes.arrayOf(propTypes.object),
  heading: propTypes.string,
  onExpandGroup: propTypes.func,
};
