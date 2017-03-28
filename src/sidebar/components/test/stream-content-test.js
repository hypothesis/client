'use strict';

var angular = require('angular');
var inherits = require('inherits');
var EventEmitter = require('tiny-emitter');

function FakeRootThread() {
  this.thread = sinon.stub();
}
inherits(FakeRootThread, EventEmitter);

describe('StreamContentController', function () {
  var $componentController;
  var $rootScope;
  var fakeRoute;
  var fakeRouteParams;
  var fakeAnnotationMapper;
  var fakeAnnotationUI;
  var fakeQueryParser;
  var fakeRootThread;
  var fakeSearchFilter;
  var fakeStore;
  var fakeStreamer;
  var fakeStreamFilter;


  before(function () {
    angular.module('h', [])
      .component('streamContent', require('../stream-content'));
  });

  beforeEach(function () {
    fakeAnnotationMapper = {
      loadAnnotations: sinon.spy(),
    };

    fakeAnnotationUI = {
      clearAnnotations: sinon.spy(),
      setAppIsSidebar: sinon.spy(),
      setCollapsed: sinon.spy(),
      setForceVisible: sinon.spy(),
      setSortKey: sinon.spy(),
      subscribe: sinon.spy(),
    };

    fakeRouteParams = {id: 'test'};

    fakeQueryParser = {
      populateFilter: sinon.spy(),
    };

    fakeRoute = {
      reload: sinon.spy(),
    };

    fakeSearchFilter = {
      generateFacetedFilter: sinon.stub(),
      toObject: sinon.stub().returns({}),
    };

    fakeStore = {
      search: sinon.spy(function () {
        return Promise.resolve({rows: [], total: 0});
      }),
    };

    fakeStreamer = {
      open: sinon.spy(),
      close: sinon.spy(),
      setConfig: sinon.spy(),
      connect: sinon.spy(),
    };

    fakeStreamFilter = {
      resetFilter: sinon.stub().returnsThis(),
      setMatchPolicyIncludeAll: sinon.stub().returnsThis(),
      getFilter: sinon.stub(),
    };

    fakeRootThread = new FakeRootThread();

    angular.mock.module('h', {
      $route: fakeRoute,
      $routeParams: fakeRouteParams,
      annotationMapper: fakeAnnotationMapper,
      annotationUI: fakeAnnotationUI,
      queryParser: fakeQueryParser,
      rootThread: fakeRootThread,
      searchFilter: fakeSearchFilter,
      store: fakeStore,
      streamFilter: fakeStreamFilter,
      streamer: fakeStreamer,
    });

    angular.mock.inject(function (_$componentController_, _$rootScope_) {
      $componentController = _$componentController_;
      $rootScope = _$rootScope_;
    });
  });

  function createController() {
    return $componentController('streamContent', {}, {
      search: {
        query: sinon.stub(),
        update: sinon.stub(),
      },
    });
  }

  it('calls the search API with `_separate_replies: true`', function () {
    createController();
    assert.equal(fakeStore.search.firstCall.args[0]._separate_replies, true);
  });

  it('passes the annotations and replies from search to loadAnnotations()', function () {
    fakeStore.search = function () {
      return Promise.resolve({
        'rows': ['annotation_1', 'annotation_2'],
        'replies': ['reply_1', 'reply_2', 'reply_3'],
      });
    };

    createController();

    return Promise.resolve().then(function () {
      assert.calledOnce(fakeAnnotationMapper.loadAnnotations);
      assert.calledWith(fakeAnnotationMapper.loadAnnotations,
        ['annotation_1', 'annotation_2'], ['reply_1', 'reply_2', 'reply_3']);
    });
  });

  context('when a $routeUpdate event occurs', function () {
    it('reloads the route if the query changed', function () {
      fakeRouteParams.q = 'test query';
      createController();
      fakeRouteParams.q = 'new query';
      $rootScope.$broadcast('$routeUpdate');
      assert.called(fakeAnnotationUI.clearAnnotations);
      assert.calledOnce(fakeRoute.reload);
    });

    it('does not reload the route if the query did not change', function () {
      fakeRouteParams.q = 'test query';
      createController();
      $rootScope.$broadcast('$routeUpdate');
      assert.notCalled(fakeAnnotationUI.clearAnnotations);
      assert.notCalled(fakeRoute.reload);
    });
  });
});
