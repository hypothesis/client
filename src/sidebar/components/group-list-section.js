'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const GroupListItem = require('./group-list-item');
const MenuSection = require('./menu-section');

/**
 * A labeled section of the groups list.
 */
function GroupListSection({ expandedGroup, onExpandGroup, groups, heading }) {
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
  /**
   * The `Group` whose submenu is currently expanded, or `null` if no group
   * is currently expanded.
   */
  expandedGroup: propTypes.object,
  /* The list of groups to be displayed in the group list section. */
  groups: propTypes.arrayOf(propTypes.object),
  /* The string name of the group list section. */
  heading: propTypes.string,
  /**
   * Callback invoked when a group is expanded or collapsed.
   *
   * The argument is the group being expanded, or `null` if the expanded group
   * is being collapsed.
   *
   * @type {(group: Group|null) => any}
   */
  onExpandGroup: propTypes.func,
};

module.exports = GroupListSection;
