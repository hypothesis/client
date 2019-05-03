'use strict';

const { createElement } = require('preact');

const { mount } = require('enzyme');
const GroupListItem = require('../group-list-item');

const { events } = require('../../services/analytics');

describe('GroupListItem', () => {
  let fakeAnalytics;
  let fakeGroups;
  let fakeStore;
  let fakeGroupListItemCommon;

  const fakeGroup = {
    id: 'groupid',
    name: 'Test',
    links: {
      html: 'https://annotate.com/groups/groupid',
    },
    scopes: {
      enforced: false,
    },
  };

  beforeEach(() => {
    fakeStore = {
      focusGroup: sinon.stub(),
      focusedGroupId: sinon.stub().returns('groupid'),
      clearDirectLinkedIds: sinon.stub(),
      clearDirectLinkedGroupFetchFailed: sinon.stub(),
    };

    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };

    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
    };

    fakeGroups = {
      leave: sinon.stub(),
    };

    GroupListItem.$imports.$mock({
      '../util/group-list-item-common': fakeGroupListItemCommon,
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    GroupListItem.$imports.$restore();
  });

  const createGroupListItem = fakeGroup => {
    return mount(
      <GroupListItem
        group={fakeGroup}
        groups={fakeGroups}
        analytics={fakeAnalytics}
      />
    );
  };

  it('changes the focused group when group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledWith(fakeStore.focusGroup, fakeGroup.id);
    assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.GROUP_SWITCH);
  });

  it('clears the direct linked ids from the store when the group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledOnce(fakeStore.clearDirectLinkedIds);
  });

  it('clears the direct-linked group fetch failed from the store when the group is clicked', () => {
    const wrapper = createGroupListItem(fakeGroup);
    wrapper
      .find('MenuItem')
      .props()
      .onClick();

    assert.calledOnce(fakeStore.clearDirectLinkedGroupFetchFailed);
  });

  it('sets alt text for organization logo', () => {
    const group = {
      ...fakeGroup,
      // Dummy scheme to avoid actually trying to load image.
      logo: 'dummy://hypothes.is/logo.svg',
      organization: { name: 'org' },
    };
    fakeGroupListItemCommon.orgName
      .withArgs(group)
      .returns(group.organization.name);

    const wrapper = createGroupListItem(group);
    const altText = wrapper.find('MenuItem').prop('iconAlt');

    assert.equal(altText, group.organization.name);
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

        const wrapper = createGroupListItem(fakeGroup);

        assert.equal(
          wrapper.find('MenuItem').prop('isSelected'),
          expectedIsSelected
        );
      });
    });
  });
});
