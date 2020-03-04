import angular from 'angular';
import EventEmitter from 'tiny-emitter';

import streamContent from '../stream-content';

class FakeRootThread extends EventEmitter {
  constructor() {
    super();
    this.thread = sinon.stub();
  }
}

describe('StreamContentController', function() {
  let $componentController;
  let fakeAnnotationMapper;
  let fakeStore;
  let fakeRootThread;
  let fakeSearchFilter;
  let fakeApi;
  let fakeStreamer;
  let fakeStreamFilter;

  before(function() {
    angular.module('h', []).component('streamContent', streamContent);
  });

  beforeEach(function() {
    fakeAnnotationMapper = {
      loadAnnotations: sinon.spy(),
    };

    fakeStore = {
      clearAnnotations: sinon.spy(),
      routeParams: sinon.stub().returns({ id: 'test' }),
      setCollapsed: sinon.spy(),
      setForceVisible: sinon.spy(),
      setSortKey: sinon.spy(),
      subscribe: sinon.spy(),
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
      annotationMapper: fakeAnnotationMapper,
      store: fakeStore,
      api: fakeApi,
      rootThread: fakeRootThread,
      searchFilter: fakeSearchFilter,
      streamFilter: fakeStreamFilter,
      streamer: fakeStreamer,
    });

    angular.mock.inject(function(_$componentController_) {
      $componentController = _$componentController_;
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

  context('when route parameters change', function() {
    it('updates annotations if the query changed', function() {
      fakeStore.routeParams.returns({ q: 'test query' });
      createController();
      fakeStore.clearAnnotations.resetHistory();
      fakeApi.search.resetHistory();

      fakeStore.routeParams.returns({ q: 'new query' });
      fakeStore.subscribe.lastCall.callback();

      assert.called(fakeStore.clearAnnotations);
      assert.called(fakeApi.search);
    });

    it('does not clear annotations if the query did not change', function() {
      fakeStore.routeParams.returns({ q: 'test query' });
      createController();
      fakeApi.search.resetHistory();
      fakeStore.clearAnnotations.resetHistory();

      fakeStore.subscribe.lastCall.callback();

      assert.notCalled(fakeStore.clearAnnotations);
      assert.notCalled(fakeApi.search);
    });
  });
});
