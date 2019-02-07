'use strict';

/**
 * Combine groups from multiple api calls together to form a unique list of groups.
 * Add an isMember property to each group indicating whether the logged in user is a member.
 *
 * @param {Group[]} userGroups - groups the user is a member of
 * @param {Group[]} featuredGroups - groups scoped to the particular uri, authority, and user
 */
function combineGroups(userGroups, featuredGroups) {
  const worldGroup = featuredGroups.find(g => g.id === '__world__');
  if (worldGroup) {
    userGroups.unshift(worldGroup);
  }

  const myGroupIds = userGroups.map(g => g.id);
  featuredGroups = featuredGroups.filter(g => !myGroupIds.includes(g.id));

  // Set the isMember property indicating user membership.
  featuredGroups.forEach(group => (group.isMember = false));
  userGroups.forEach(group => (group.isMember = true));

  return userGroups.concat(featuredGroups);
}

module.exports = {
  combineGroups,
};
