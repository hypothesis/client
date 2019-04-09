'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const GroupListSection = require('../group-list-section');
const GroupListItem = require('../group-list-item');
const GroupListItemOutOfScope = require('../group-list-item-out-of-scope');

describe('GroupListSection', () => {
  const createGroupListSection = fakeSectionGroups => {
    const props = {
      sectionGroups: fakeSectionGroups,
      analytics: {},
      store: {},
    };
    return shallow(<GroupListSection {...props} />);
  };

  describe('group item types', () => {
    [
      {
        description:
          'renders GroupListItem if group is out of scope but scope is not enforced',
        scopesEnforced: false,
        expectedIsSelectable: [true, true],
      },
      {
        description:
          'renders GroupListItemOutOfScope if group is out of scope and scope is enforced',
        scopesEnforced: true,
        expectedIsSelectable: [true, false],
      },
    ].forEach(({ description, scopesEnforced, expectedIsSelectable }) => {
      it(description, () => {
        const fakeSectionGroups = [
          {
            isScopedToUri: true,
            scopes: { enforced: scopesEnforced },
            id: 0,
          },
          {
            isScopedToUri: false,
            scopes: { enforced: scopesEnforced },
            id: 1,
          },
        ];

        const wrapper = createGroupListSection(fakeSectionGroups);

        const itemTypes = wrapper
          .findWhere(
            n =>
              n.type() === GroupListItem || n.type() === GroupListItemOutOfScope
          )
          .map(item => item.type().name);
        const expectedItemTypes = fakeSectionGroups.map(g =>
          expectedIsSelectable[g.id]
            ? 'GroupListItem'
            : 'GroupListItemOutOfScope'
        );
        assert.deepEqual(itemTypes, expectedItemTypes);
      });
    });
  });
});
