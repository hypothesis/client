'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('searchStatusBar', function() {
  before(function() {
    angular
      .module('app', [])
      .component('searchStatusBar', require('../search-status-bar'));
  });

  beforeEach(function() {
    angular.mock.module('app');
  });

  context('when there is a filter', function() {
    it('should display the filter count', function() {
      const elem = util.createDirective(document, 'searchStatusBar', {
        filterActive: true,
        filterMatchCount: 5,
      });
      assert.include(elem[0].textContent, '5 search results');
    });
  });

  context('when there is a selection', function() {
    it('should display the "Show all annotations (2)" message when there are 2 annotations', function() {
      const msg = 'Show all annotations';
      const msgCount = '(2)';
      const elem = util.createDirective(document, 'searchStatusBar', {
        areAllAnnotationsVisible: true,
        totalAnnotations: 2,
        selectedTab: 'annotation',
      });
      const clearBtn = elem[0].querySelector('button');
      assert.include(clearBtn.textContent, msg);
      assert.include(clearBtn.textContent, msgCount);
    });

    it('should display the "Show all notes (3)" message when there are 3 notes', function() {
      const msg = 'Show all notes';
      const msgCount = '(3)';
      const elem = util.createDirective(document, 'searchStatusBar', {
        areAllAnnotationsVisible: true,
        totalNotes: 3,
        selectedTab: 'note',
      });
      const clearBtn = elem[0].querySelector('button');
      assert.include(clearBtn.textContent, msg);
      assert.include(clearBtn.textContent, msgCount);
    });
  });
});
