'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const GroupListItem = require('./group-list-item');
const MenuSection = require('./menu-section');

/**
 * A labeled section of the groups list.
 */
function GroupListSection({ groups, heading }) {
  return (
    <MenuSection heading={heading}>
      {groups.map(group => (
        <GroupListItem key={group.id} group={group} />
      ))}
    </MenuSection>
  );
}

GroupListSection.propTypes = {
  /* The list of groups to be displayed in the group list section. */
  groups: propTypes.arrayOf(propTypes.object),
  /* The string name of the group list section. */
  heading: propTypes.string,
};

module.exports = GroupListSection;
