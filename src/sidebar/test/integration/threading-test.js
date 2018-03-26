'use strict';

var angular = require('angular');
var immutable = require('seamless-immutable');

var unroll = require('../../../shared/test/util').unroll;

var fixtures = immutable({
  annotations: [{
    $orphan: false,
    id: '1',
    references: [],
    target: [{selector: []}],
    text: 'first annotation',
    updated: 50,
  },{
    $orphan: false,
    id: '2',
    references: [],
    text: 'second annotation',
    target: [{selector: []}],
    updated: 200,
  },{
    $orphan: false,
    id: '3',
    references: ['2'],
    text: 'reply to first annotation',
    updated: 100,
  }],
});

describe('annotation threading', function () {
  var store;
  var rootThread;

  beforeEach(function () {
    var fakeUnicode = {
      normalize: function (s) { return s; },
      fold: function (s) { return s; },
    };

    var fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };

    angular.module('app', [])
      .service('store', require('../../store'))
      .service('drafts', require('../../services/drafts'))
      .service('rootThread', require('../../services/root-thread'))
      .service('searchFilter', require('../../services/search-filter'))
      .service('viewFilter', require('../../services/view-filter'))
      .value('features', fakeFeatures)
      .value('settings', {})
      .value('unicode', fakeUnicode);

    angular.mock.module('app');

    angular.mock.inject(function (_store_, _rootThread_) {
      store = _store_;
      rootThread = _rootThread_;
    });
  });

  it('should display newly loaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    assert.equal(rootThread.thread(store.getState()).children.length, 2);
  });

  it('should not display unloaded annotations', function () {
    store.addAnnotations(fixtures.annotations);
    store.removeAnnotations(fixtures.annotations);
    assert.equal(rootThread.thread(store.getState()).children.length, 0);
  });

  it('should filter annotations when a search is set', function () {
    store.addAnnotations(fixtures.annotations);
    store.setFilterQuery('second');
    assert.equal(rootThread.thread(store.getState()).children.length, 1);
    assert.equal(rootThread.thread(store.getState()).children[0].id, '2');
  });

  unroll('should sort annotations by #mode', function (testCase) {
    store.addAnnotations(fixtures.annotations);
    store.setSortKey(testCase.sortKey);
    var actualOrder = rootThread.thread(store.getState()).children.map(function (thread) {
      return thread.annotation.id;
    });
    assert.deepEqual(actualOrder, testCase.expectedOrder);
  }, [{
    sortKey: 'Oldest',
    expectedOrder: ['1','2'],
  },{
    sortKey: 'Newest',
    expectedOrder: ['2','1'],
  }]);
});
