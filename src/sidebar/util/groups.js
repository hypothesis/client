import escapeStringRegexp from 'escape-string-regexp';
import serviceConfig from '../service-config';

/**
 * Returns the value for allowLeavingGroups from the service config
 * settings. By default this value is true. In that case, it is
 * intended that groups can be left if they are private. If this
 * value returns false, then the user can not leave any groups.
 *
 * @param {object} settings
 * @return {boolean}
 */
function allowLeavingGroups(settings) {
  const serviceConfig_ = serviceConfig(settings);
  if (serviceConfig_ === null) {
    return true;
  }
  if (typeof serviceConfig_.allowLeavingGroups !== 'boolean') {
    return true;
  }
  return serviceConfig_.allowLeavingGroups;
}

/**
 * Combine groups from multiple api calls together to form a unique list of groups.
 * Add an isMember property to each group indicating whether the logged in user is a member.
 * Add an isScopedToUri property to each group indicating whether the uri matches the group's
 *   uri patterns. If no uri patterns are specified, defaults to True.
 *
 * @param {Group[]} userGroups - groups the user is a member of
 * @param {Group[]} featuredGroups - all other groups, may include some duplicates from the userGroups
 * @param {string} uri - uri of the current page
 * @param {object} settings - The settings object.
 */
export function combineGroups(userGroups, featuredGroups, uri, settings) {
  const worldGroup = featuredGroups.find(g => g.id === '__world__');
  if (worldGroup) {
    userGroups.unshift(worldGroup);
  }

  const myGroupIds = userGroups.map(g => g.id);
  featuredGroups = featuredGroups.filter(g => !myGroupIds.includes(g.id));

  // Set the `canLeave` property. Groups can be left if they are private unless
  // the global `allowLeavingGroups` value is false in the config settings object.
  const setCanLeave = group => {
    group.canLeave = !allowLeavingGroups(settings)
      ? false
      : group.type === 'private';
  };
  // Set the isMember property indicating user membership.
  featuredGroups.forEach(group => {
    group.isMember = false;
    setCanLeave(group);
  });
  userGroups.forEach(group => {
    group.isMember = true;
    setCanLeave(group);
  });

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
        uriRegex.split('*').map(escapeStringRegexp).join('.*')
      )
    ) !== undefined
  );
}
