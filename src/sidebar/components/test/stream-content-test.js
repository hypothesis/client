'use strict';

const angular = require('angular');
const EventEmitter = require('tiny-emitter');

class FakeRootThread extends EventEmitter {
  constructor() {
    super();
    this.thread = sinon.stub();
  }
}

describe('StreamContentController', function() {
  let $componentController;
  let $rootScope;
  let fakeRoute;
  let fakeRouteParams;
  let fakeAnnotationMapper;
  let fakeStore;
  let fakeRootThread;
  let fakeSearchFilter;
  let fakeApi;
  let fakeStreamer;
  let fakeStreamFilter;

  before(function() {
    angular
      .module('h', [])
      .component('streamContent', require('../stream-content'));
  });

  beforeEach(function() {
    fakeAnnotationMapper = {
      loadAnnotations: sinon.spy(),
    };

    fakeStore = {
      clearAnnotations: sinon.spy(),
      setAppIsSidebar: sinon.spy(),
      setCollapsed: sinon.spy(),
      setForceVisible: sinon.spy(),
      setSortKey: sinon.spy(),
      subscribe: sinon.spy(),
    };

    fakeRouteParams = { id: 'test' };

    fakeRoute = {
      reload: sinon.spy(),
    };

    fakeSearchFilter = {
      generateFacetedFilter: sinon.stub(),
      toObject: sinon.stub().returns({}),
    };

    fakeApi = {
      search: sinon.spy(function() {
        return Promise.resolve({ rows: [], total: 0 });
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
      store: fakeStore,
      api: fakeApi,
      rootThread: fakeRootThread,
      searchFilter: fakeSearchFilter,
      streamFilter: fakeStreamFilter,
      streamer: fakeStreamer,
    });

    angular.mock.inject(function(_$componentController_, _$rootScope_) {
      $componentController = _$componentController_;
      $rootScope = _$rootScope_;
    });
  });

  function createController() {
    return $componentController('streamContent', {}, {});
  }

  it('clears any existing annotations when the /stream route is loaded', () => {
    createController();
    assert.calledOnce(fakeStore.clearAnnotations);
  });

  it('calls the search API with `_separate_replies: true`', function() {
    createController();
    assert.equal(fakeApi.search.firstCall.args[0]._separate_replies, true);
  });

  it('passes the annotations and replies from search to loadAnnotations()', function() {
    fakeApi.search = function() {
      return Promise.resolve({
        rows: ['annotation_1', 'annotation_2'],
        replies: ['reply_1', 'reply_2', 'reply_3'],
      });
    };

    createController();

    return Promise.resolve().then(function() {
      assert.calledOnce(fakeAnnotationMapper.loadAnnotations);
      assert.calledWith(
        fakeAnnotationMapper.loadAnnotations,
        ['annotation_1', 'annotation_2'],
        ['reply_1', 'reply_2', 'reply_3']
      );
    });
  });

  context('when a $routeUpdate event occurs', function() {
    it('reloads the route if the query changed', function() {
      fakeRouteParams.q = 'test query';
      createController();
      fakeRouteParams.q = 'new query';
      $rootScope.$broadcast('$routeUpdate');
      assert.called(fakeStore.clearAnnotations);
      assert.calledOnce(fakeRoute.reload);
    });

    it('does not reload the route if the query did not change', function() {
      fakeRouteParams.q = 'test query';
      createController();
      fakeStore.clearAnnotations.resetHistory();

      $rootScope.$broadcast('$routeUpdate');

      assert.notCalled(fakeStore.clearAnnotations);
      assert.notCalled(fakeRoute.reload);
    });
  });
});
