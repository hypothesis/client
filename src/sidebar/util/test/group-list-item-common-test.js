'use strict';

const groupListItemCommon = require('../group-list-item-common');

const { events } = require('../../services/analytics');

describe('sidebar/util/groupListItemCommon', () => {
  describe('trackViewGroupActivity', () => {
    it('triggers the GROUP_VIEW_ACTIVITY event when called', () => {
      const fakeAnalytics = {
        track: sinon.stub(),
        events,
      };
      groupListItemCommon.trackViewGroupActivity(fakeAnalytics);

      assert.calledWith(
        fakeAnalytics.track,
        fakeAnalytics.events.GROUP_VIEW_ACTIVITY
      );
    });
  });

  describe('orgName', () => {
    it('returns the organization name if it exists', () => {
      const fakeGroup = { id: 'groupid', organization: { name: 'org' } };

      const organizationName = groupListItemCommon.orgName(fakeGroup);
      assert.equal(organizationName, fakeGroup.organization.name);
    });

    it('returns undefined if group has no organization', () => {
      const fakeGroup = { id: 'groupid' };

      assert.isUndefined(groupListItemCommon.orgName(fakeGroup));
    });
  });
});
