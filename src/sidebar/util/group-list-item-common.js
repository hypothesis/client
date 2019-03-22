'use strict';

function orgName(group) {
  return group.organization && group.organization.name;
}

function trackViewGroupActivity(analytics) {
  analytics.track(analytics.events.GROUP_VIEW_ACTIVITY);
}

module.exports = {
  orgName,
  trackViewGroupActivity,
};
