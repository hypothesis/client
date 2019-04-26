'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const GroupListSection = require('../group-list-section');
const GroupListItem = require('../group-list-item');
const GroupListItemOutOfScope = require('../group-list-item-out-of-scope');

describe('GroupListSection', () => {
  const createGroupListSection = groups => {
    return shallow(
      <GroupListSection groups={groups} analytics={{}} store={{}} />
    );
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
        const groups = [
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

        const wrapper = createGroupListSection(groups);

        // Check that the correct group item components were rendered for
        // each group, depending on whether the group can be annotated in on
        // the current document.
        const itemTypes = wrapper
          .findWhere(
            n =>
              n.type() === GroupListItem || n.type() === GroupListItemOutOfScope
          )
          .map(item => item.type());
        const expectedItemTypes = groups.map(g =>
          expectedIsSelectable[g.id] ? GroupListItem : GroupListItemOutOfScope
        );
        assert.deepEqual(itemTypes, expectedItemTypes);
      });
    });
  });
});
