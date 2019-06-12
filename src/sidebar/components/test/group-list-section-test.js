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
  } = {}) => {
    return shallow(<GroupListSection groups={groups} heading={heading} />);
  };

  it('renders heading', () => {
    const wrapper = createGroupListSection();
    assert.equal(wrapper.find(MenuSection).prop('heading'), 'Test section');
  });

  it('renders groups', () => {
    const wrapper = createGroupListSection();
    assert.equal(wrapper.find(GroupListItem).length, testGroups.length);
  });
});
