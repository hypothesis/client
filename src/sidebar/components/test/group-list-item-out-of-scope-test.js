'use strict';

const angular = require('angular');
const proxyquire = require('proxyquire');
const util = require('../../directive/test/util');

const { events } = require('../../services/analytics');

describe('groupListItemOutOfScope', () => {
  let fakeAnalytics;
  let fakeGroupListItemCommon;

  before(() => {
    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
      trackViewGroupActivity: sinon.stub(),
    };

    // Return groupListItemOutOfScope with groupListItemCommon stubbed out.
    const groupListItemOutOfScope = proxyquire(
      '../group-list-item-out-of-scope',
      {
        '../util/group-list-item-common': fakeGroupListItemCommon,
        '@noCallThru': true,
      }
    );

    angular
      .module('app', [])
      .component('groupListItemOutOfScope', groupListItemOutOfScope);
  });

  beforeEach(() => {
    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };

    angular.mock.module('app', { analytics: fakeAnalytics });
  });

  const createGroupListItemOutOfScope = fakeGroup => {
    return util.createDirective(document, 'groupListItemOutOfScope', {
      group: fakeGroup,
    });
  };

  it('calls groupListItemCommon.trackViewGroupActivity when trackViewGroupActivity is called', () => {
    const fakeGroup = { id: 'groupid' };

    const element = createGroupListItemOutOfScope(fakeGroup);
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

    const element = createGroupListItemOutOfScope(fakeGroup);
    const orgName = element.ctrl.orgName();

    assert.calledWith(fakeGroupListItemCommon.orgName, fakeGroup);
    assert.equal(orgName, fakeGroup.organization.name);
  });

  describe('toggleGroupDetails', () => {
    it('sets the default expanded value to false', () => {
      const fakeGroup = { id: 'groupid' };

      const element = createGroupListItemOutOfScope(fakeGroup);

      assert.isFalse(element.ctrl.isDetailsExpanded);
    });

    it('toggles the expanded value', () => {
      const fakeGroup = { id: 'groupid' };

      const element = createGroupListItemOutOfScope(fakeGroup);
      const fakeEvent = { stopPropagation: sinon.stub() };

      element.ctrl.toggleGroupDetails(fakeEvent);
      assert.isTrue(element.ctrl.isDetailsExpanded);

      element.ctrl.toggleGroupDetails(fakeEvent);
      assert.isFalse(element.ctrl.isDetailsExpanded);
    });

    it('stops the event from propagating when toggling', () => {
      const fakeGroup = { id: 'groupid' };

      const element = createGroupListItemOutOfScope(fakeGroup);
      const fakeEvent = { stopPropagation: sinon.spy() };

      element.ctrl.toggleGroupDetails(fakeEvent);

      sinon.assert.called(fakeEvent.stopPropagation);
    });
  });
});
