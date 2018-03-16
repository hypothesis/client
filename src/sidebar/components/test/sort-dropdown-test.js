'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

describe('sortDropdown', function () {
  before(function () {
    angular.module('app', ['pascalprecht.translate'], function($translateProvider){
      $translateProvider.translations('en', {
        'Feedback' : 'Feedback',
      });
      $translateProvider.preferredLanguage('en');

    })
      .component('sortDropdown', require('../sort-dropdown'));
  });

  beforeEach(function () {
    angular.mock.module('app');
  });

  it('should update the sort key on click', function () {
    var changeSpy = sinon.spy();
    var elem = util.createDirective(document, 'sortDropdown', {
      sortKeysAvailable: ['Newest', 'Oldest'],
      sortKey: 'Newest',
      onChangeSortKey: {
        args: ['sortKey'],
        callback: changeSpy,
      },
    });
    var links = elem.find('li');
    angular.element(links[0]).click();
    assert.calledWith(changeSpy, 'Newest');
  });
});
