'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const { events } = require('../../services/analytics');
const GroupListItemOutOfScope = require('../group-list-item-out-of-scope');

describe('GroupListItemOutOfScope', () => {
  let fakeAnalytics;
  let fakeGroupListItemCommon;

  const fakeGroup = {
    id: 'groupid',
    links: {
      html: 'https://hypothes.is/groups/groupid',
    },
    logo: 'dummy://hypothes.is/logo.svg',
    organization: { name: 'org' },
  };

  // Click on the item to expand or collapse it.
  const toggle = wrapper =>
    wrapper
      .find('div')
      .first()
      .simulate('click');

  beforeEach(() => {
    fakeAnalytics = {
      track: sinon.stub(),
      events,
    };
    fakeGroupListItemCommon = {
      orgName: sinon.stub(),
      trackViewGroupActivity: sinon.stub(),
    };

    GroupListItemOutOfScope.$imports.$mock({
      '../util/group-list-item-common': fakeGroupListItemCommon,
    });
  });

  afterEach(() => {
    GroupListItemOutOfScope.$imports.$restore();
  });

  const createGroupListItemOutOfScope = fakeGroup => {
    return mount(
      <GroupListItemOutOfScope analytics={fakeAnalytics} group={fakeGroup} />
    );
  };

  it('calls trackViewGroupActivity when "Go to group page" link is clicked', () => {
    const wrapper = createGroupListItemOutOfScope(fakeGroup);

    toggle(wrapper);

    const link = wrapper
      .find('a')
      .filterWhere(link => link.text() === 'Go to group page');
    link.simulate('click');

    assert.calledWith(
      fakeGroupListItemCommon.trackViewGroupActivity,
      fakeAnalytics
    );
  });

  it('does not show "Go to group page" link if the group has no HTML link', () => {
    const group = { ...fakeGroup, links: {} };
    const wrapper = createGroupListItemOutOfScope(group);
    const link = wrapper
      .find('a')
      .filterWhere(link => link.text() === 'Go to group page');
    assert.isFalse(link.exists());
  });

  it('sets alt text of logo', () => {
    fakeGroupListItemCommon.orgName
      .withArgs(fakeGroup)
      .returns(fakeGroup.organization.name);

    const wrapper = createGroupListItemOutOfScope(fakeGroup);
    const orgName = wrapper.find('img').props().alt;

    assert.equal(orgName, fakeGroup.organization.name);
  });

  it('toggles expanded state when clicked', () => {
    const wrapper = createGroupListItemOutOfScope(fakeGroup);

    assert.isFalse(wrapper.exists('.expanded'));

    toggle(wrapper);
    assert.isTrue(wrapper.exists('.expanded'));

    toggle(wrapper);
    assert.isFalse(wrapper.exists('.expanded'));
  });
});
