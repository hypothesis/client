'use strict';

const angular = require('angular');
const proxyquire = require('proxyquire');
const util = require('../../directive/test/util');

const { events } = require('../../services/analytics');

describe('groupListItem', () => {
  let fakeAnalytics;
  let fakeStore;
  let fakeGroupListItemCommon;

  before(() => {
    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
      trackViewGroupActivity: sinon.stub(),
    };

    // Return groupListItem with groupListItemCommon stubbed out.
    const groupListItem = proxyquire('../group-list-item', {
      '../util/group-list-item-common': fakeGroupListItemCommon,
      '@noCallThru': true,
    });

    angular.module('app', []).component('groupListItem', groupListItem);
  });

  beforeEach(() => {
    fakeStore = {
      focusGroup: sinon.stub(),
      focusedGroupId: sinon.stub().returns('groupid'),
    };

    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };

    angular.mock.module('app', {
      analytics: fakeAnalytics,
      store: fakeStore,
    });
  });

  const createGroupListItem = fakeGroup => {
    return util.createDirective(document, 'groupListItem', {
      group: fakeGroup,
    });
  };

  it('changes the focused group when group is clicked', () => {
    const fakeGroup = { id: 'groupid' };

    const element = createGroupListItem(fakeGroup);
    const group = element.find('.group-list-item__item');

    group[0].click();

    assert.calledWith(fakeStore.focusGroup, fakeGroup.id);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('calls groupListItemCommon.trackViewGroupActivity when trackViewGroupActivity is called', () => {
    const fakeGroup = { id: 'groupid' };

    const element = createGroupListItem(fakeGroup);
    element.ctrl.trackViewGroupActivity();

    assert.calledWith(
      fakeGroupListItemCommon.trackViewGroupActivity,
      fakeAnalytics
    );
  });

  it('returns groupListItemCommon.orgName when orgName is called', () => {
    const fakeGroup = { id: 'groupid', organization: { name: 'org' } };
    fakeGroupListItemCommon.orgName
      .withArgs(fakeGroup)
      .returns(fakeGroup.organization.name);

    const element = createGroupListItem(fakeGroup);
    const orgName = element.ctrl.orgName();

    assert.equal(orgName, fakeGroup.organization.name);
  });

  describe('isSelected', () => {
    [
      {
        description: 'returns true if group is the focused group',
        focusedGroupId: 'groupid',
        expectedIsSelected: true,
      },
      {
        description: 'returns false if group is not the focused group',
        focusedGroupId: 'other',
        expectedIsSelected: false,
      },
    ].forEach(({ description, focusedGroupId, expectedIsSelected }) => {
      it(description, () => {
        fakeStore.focusedGroupId.returns(focusedGroupId);
        const fakeGroup = { id: 'groupid' };

        const element = createGroupListItem(fakeGroup);

        assert.equal(element.ctrl.isSelected(), expectedIsSelected);
      });
    });
  });
});
