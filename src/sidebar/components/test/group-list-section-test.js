'use strict';

const angular = require('angular');
const groupListSection = require('../group-list-section');
const util = require('../../directive/test/util');

describe('groupListSection', () => {
  before(() => {
    angular.module('app', []).component('groupListSection', groupListSection);
  });

  beforeEach(() => {
    angular.mock.module('app', {});
  });

  const createGroupListSection = (
    fakeSectionGroups,
    fakeDisableOosGroupSelection
  ) => {
    const config = {
      sectionGroups: fakeSectionGroups,
    };
    if (fakeDisableOosGroupSelection !== undefined) {
      config.disableOosGroupSelection = fakeDisableOosGroupSelection;
    }
    return util.createDirective(document, 'groupListSection', config);
  };

  describe('isSelectable', () => {
    [
      {
        description: 'always returns true if disableOosGroupSelection is false',
        fakeDisableOosGroupSelection: false,
        expectedIsSelectable: [true, true],
      },
      {
        description:
          'always returns true if disableOosGroupSelection is undefined',
        fakeDisableOosGroupSelection: undefined,
        expectedIsSelectable: [true, true],
      },
      {
        description:
          'returns false if disableOosGroupSelection is true and group is out of scope',
        fakeDisableOosGroupSelection: true,
        expectedIsSelectable: [true, false],
      },
    ].forEach(
      ({ description, fakeDisableOosGroupSelection, expectedIsSelectable }) => {
        it(description, () => {
          const fakeSectionGroups = [
            { isScopedToUri: true, id: 0 },
            { isScopedToUri: false, id: 1 },
          ];

          const element = createGroupListSection(
            fakeSectionGroups,
            fakeDisableOosGroupSelection
          );

          fakeSectionGroups.forEach(g =>
            assert.equal(
              element.ctrl.isSelectable(g.id),
              expectedIsSelectable[g.id]
            )
          );
        });
      }
    );
  });
});
