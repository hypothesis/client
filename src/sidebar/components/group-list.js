'use strict';

const { isThirdPartyUser } = require('../util/account-id');
const isThirdPartyService = require('../util/is-third-party-service');
const serviceConfig = require('../service-config');
const memoize = require('../util/memoize');
const groupsByOrganization = require('../util/group-organizations');

const groupOrganizations = memoize(groupsByOrganization);

const myGroupOrgs = memoize(groupsByOrganization);

const featuredGroupOrgs = memoize(groupsByOrganization);

const currentlyViewingGroupOrgs = memoize(groupsByOrganization);

// @ngInject
function GroupListController(
  $window,
  analytics,
  features,
  groups,
  settings,
  serviceUrl,
  store
) {
  this.groups = groups;

  // Track which non-selectable groups have their group details expanded.
  this.groupDetailsExpanded = {};

  this.createNewGroup = function() {
    $window.open(serviceUrl('groups.new'), '_blank');
  };

  this.focusedIcon = function() {
    const focusedGroup = this.groups.focused();
    return (
      focusedGroup &&
      (focusedGroup.organization.logo || this.thirdPartyGroupIcon)
    );
  };

  this.focusedIconClass = function() {
    const focusedGroup = this.groups.focused();
    return focusedGroup && focusedGroup.type === 'private' ? 'group' : 'public';
  };

  this.isThirdPartyUser = function() {
    return isThirdPartyUser(this.auth.userid, settings.authDomain);
  };

  this.leaveGroup = function(groupId) {
    const groupName = groups.get(groupId).name;
    const message =
      'Are you sure you want to leave the group "' + groupName + '"?';
    if ($window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(groupId);
    }
  };

  this.orgName = function(groupId) {
    const group = this.groups.get(groupId);
    return group && group.organization && group.organization.name;
  };

  this.groupOrganizations = function() {
    return groupOrganizations(this.groups.all());
  };

  this.currentlyViewingGroupOrganizations = function() {
    return currentlyViewingGroupOrgs(store.getCurrentlyViewingGroups());
  };

  this.featuredGroupOrganizations = function() {
    return featuredGroupOrgs(store.getFeaturedGroups());
  };

  this.myGroupOrganizations = function() {
    return myGroupOrgs(store.getMyGroups());
  };

  this.viewGroupActivity = function() {
    analytics.track(analytics.events.GROUP_VIEW_ACTIVITY);
  };

  this.focusGroup = function(groupId) {
    analytics.track(analytics.events.GROUP_SWITCH);
    groups.focus(groupId);
  };

  this.isGroupDetailsExpanded = function(groupId) {
    if (!(groupId in this.groupDetailsExpanded)) {
      this.groupDetailsExpanded[groupId] = false;
    }
    return this.groupDetailsExpanded[groupId];
  };

  /**
   * Toggle the expanded setting on un-selectable groups.
   */
  this.toggleGroupDetails = function(event, groupId) {
    event.stopPropagation();
    // Call the isGroupDetailsExpanded method so that if the groupId doesn't exist,
    // it gets added before toggling it.
    this.groupDetailsExpanded[groupId] = !this.isGroupDetailsExpanded(groupId);
  };

  /**
   * Show the share link for the group if it is not a third-party group
   * AND if the URL needed is present in the group object. We should be able
   * to simplify this once the API is adjusted only to return the link
   * when applicable.
   */
  this.shouldShowActivityLink = function(groupId) {
    const group = groups.get(groupId);
    return group.links && group.links.html && !this.isThirdPartyService;
  };

  const svc = serviceConfig(settings);
  if (svc && svc.icon) {
    this.thirdPartyGroupIcon = svc.icon;
  }

  this.isThirdPartyService = isThirdPartyService(settings);

  this.showGroupsMenu = () => {
    if (features.flagEnabled('community_groups')) {
      // Only show the drop down menu if there is more than one group.
      return this.groups.all().length > 1;
    } else {
      return !(this.isThirdPartyService && this.groups.all().length <= 1);
    }
  };

  /**
   * Expose the feature flag so it can be used in the template logic to show
   * or hide the new groups menu.
   */
  this.isFeatureFlagEnabled = flag => {
    return features.flagEnabled(flag);
  };
}

module.exports = {
  controller: GroupListController,
  controllerAs: 'vm',
  bindings: {
    auth: '<',
  },
  template: require('../templates/group-list.html'),
};
