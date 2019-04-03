'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');
const proxyquire = require('proxyquire');

const { events } = require('../../services/analytics');

describe('GroupListItem', () => {
  let fakeAnalytics;
  let fakeStore;
  let fakeGroupListItemCommon;
  let GroupListItem;

  before(() => {
    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
      trackViewGroupActivity: sinon.stub(),
    };

    GroupListItem = proxyquire('../group-list-item', {
      '../util/group-list-item-common': fakeGroupListItemCommon,
      '@noCallThru': true,
    });
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
  });

  const createGroupListItem = fakeGroup => {
    return mount(
      <GroupListItem
        group={fakeGroup}
        analytics={fakeAnalytics}
        store={fakeStore}
      />
    );
  };

  it('changes the focused group when group is clicked', () => {
    const fakeGroup = { id: 'groupid' };

    const wrapper = createGroupListItem(fakeGroup);
    wrapper.find('.group-list-item__item').simulate('click');

    assert.calledWith(fakeStore.focusGroup, fakeGroup.id);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('sets alt text for organization logo', () => {
    const fakeGroup = {
      id: 'groupid',
      // Dummy scheme to avoid actually trying to load image.
      logo: 'dummy://hypothes.is/logo.svg',
      organization: { name: 'org' },
    };
    fakeGroupListItemCommon.orgName
      .withArgs(fakeGroup)
      .returns(fakeGroup.organization.name);

    const wrapper = createGroupListItem(fakeGroup);
    const altText = wrapper.find('img').props().alt;

    assert.equal(altText, fakeGroup.organization.name);
  });

  describe('selected state', () => {
    [
      {
        description: 'is selected if group is the focused group',
        focusedGroupId: 'groupid',
        expectedIsSelected: true,
      },
      {
        description: 'is not selected if group is not the focused group',
        focusedGroupId: 'other',
        expectedIsSelected: false,
      },
    ].forEach(({ description, focusedGroupId, expectedIsSelected }) => {
      it(description, () => {
        fakeStore.focusedGroupId.returns(focusedGroupId);
        const fakeGroup = { id: 'groupid' };

        const wrapper = createGroupListItem(fakeGroup);

        assert.equal(
          wrapper.find('.group-list-item__item').hasClass('is-selected'),
          expectedIsSelected
        );
      });
    });
  });
});
