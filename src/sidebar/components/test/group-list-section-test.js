'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const GroupListSection = require('../group-list-section');
const GroupListItem = require('../group-list-item');
const MenuSection = require('../menu-section');

describe('GroupListSection', () => {
  const testGroups = [
    {
      id: 'group1',
      name: 'Group 1',
    },
    {
      id: 'group2',
      name: 'Group 2',
    },
  ];

  const createGroupListSection = ({
    groups = testGroups,
    heading = 'Test section',
    ...props
  } = {}) => {
    return shallow(
      <GroupListSection groups={groups} heading={heading} {...props} />
    );
  };

  it('renders heading', () => {
    const wrapper = createGroupListSection();
    assert.equal(wrapper.find(MenuSection).prop('heading'), 'Test section');
  });

  it('renders groups', () => {
    const wrapper = createGroupListSection();
    assert.equal(wrapper.find(GroupListItem).length, testGroups.length);
  });

  it('expands group specified by `expandedGroup` prop', () => {
    const wrapper = createGroupListSection();
    for (let i = 0; i < testGroups.length; i++) {
      wrapper.setProps({ expandedGroup: testGroups[i] });
      wrapper.find(GroupListItem).forEach((n, idx) => {
        assert.equal(n.prop('isExpanded'), idx === i);
      });
    }
  });

  it("sets expanded group when a group's submenu is expanded", () => {
    const onExpandGroup = sinon.stub();
    const wrapper = createGroupListSection({ onExpandGroup });
    wrapper
      .find(GroupListItem)
      .first()
      .props()
      .onExpand(true);
    assert.calledWith(onExpandGroup, testGroups[0]);
  });

  it("resets expanded group when group's submenu is collapsed", () => {
    const onExpandGroup = sinon.stub();
    const wrapper = createGroupListSection({
      expandedGroup: testGroups[0],
      onExpandGroup,
    });
    wrapper
      .find(GroupListItem)
      .first()
      .props()
      .onExpand(false);
    assert.calledWith(onExpandGroup, null);
  });
});
