'use strict';

const escapeStringRegexp = require('escape-string-regexp');

/**
 * Combine groups from multiple api calls together to form a unique list of groups.
 * Add an isMember property to each group indicating whether the logged in user is a member.
 * Add an isScopedToUri property to each group indicating whether the group can be annotated
 *   in based on group scoping and the uri of the current page.
 *
 * @param {Group[]} userGroups - groups the user is a member of
 * @param {Group[]} featuredGroups - groups scoped to the particular uri, authority, and user
 * @param {string} uri - uri of the current page
 */
function combineGroups(userGroups, featuredGroups, uri) {
  const worldGroup = featuredGroups.find(g => g.id === '__world__');
  if (worldGroup) {
    userGroups.unshift(worldGroup);
  }

  const myGroupIds = userGroups.map(g => g.id);
  featuredGroups = featuredGroups.filter(g => !myGroupIds.includes(g.id));

  // Set the isMember property indicating user membership.
  featuredGroups.forEach(group => (group.isMember = false));
  userGroups.forEach(group => (group.isMember = true));

  const groups = userGroups.concat(featuredGroups);

  // Add isScopedToUri property indicating whether a group is within scope
  // of the given uri. If the scope check cannot be performed, isScopedToUri
  // defaults to true.
  groups.forEach(group => (group.isScopedToUri = isScopedToUri(group, uri)));

  return groups;
}

function isScopedToUri(group, uri) {
  /* If a scope check cannot be performed, meaning:
   * - the group doesn't have a scopes attribute
   * - the group has no scopes.uri_patterns present
   * - there is no uri to compare against (aka: uri=null)
   * the group is defaulted to in-scope.
   */
  if (group.scopes && group.scopes.uri_patterns.length > 0 && uri) {
    return uriMatchesScopes(uri, group.scopes.uri_patterns);
  }
  return true;
}

function uriMatchesScopes(uri, scopes) {
  return (
    scopes.find(uriRegex =>
      uri.match(
        // Convert *'s to .*'s for regex matching and escape all other special characters.
        uriRegex
          .split('*')
          .map(escapeStringRegexp)
          .join('.*')
      )
    ) !== undefined
  );
}

module.exports = {
  combineGroups,
};
