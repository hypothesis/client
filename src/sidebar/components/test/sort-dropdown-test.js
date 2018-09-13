'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('sortDropdown', function () {
  before(function () {
    angular.module('app', [])
      .component('sortDropdown', require('../sort-dropdown'));
  });

  beforeEach(function () {
    angular.mock.module('app');
  });

  it('should update the sort key on click', function () {
    const changeSpy = sinon.spy();
    const elem = util.createDirective(document, 'sortDropdown', {
      sortKeysAvailable: ['Newest', 'Oldest'],
      sortKey: 'Newest',
      onChangeSortKey: {
        args: ['sortKey'],
        callback: changeSpy,
      },
    });
    const links = elem.find('li');
    angular.element(links[0]).click();
    assert.calledWith(changeSpy, 'Newest');
  });
});
