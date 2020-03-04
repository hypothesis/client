import angular from 'angular';

import annotationViewerContent from '../annotation-viewer-content';

// Fake implementation of the API for fetching annotations and replies to
// annotations.
function FakeApi(annots) {
  this.annots = annots;

  this.annotation = {
    get: function(query) {
      let result;
      if (query.id) {
        result = annots.find(function(a) {
          return a.id === query.id;
        });
      }
      return Promise.resolve(result);
    },
  };

  this.search = function(query) {
    let result;
    if (query.references) {
      result = annots.filter(function(a) {
        return a.references && a.references.indexOf(query.references) !== -1;
      });
    }
    return Promise.resolve({ rows: result });
  };
}

describe('annotationViewerContent', function() {
  before(function() {
    angular
      .module('h', [])
      .component('annotationViewerContent', annotationViewerContent);
  });

  beforeEach(angular.mock.module('h'));

  function createController(opts) {
    const locals = {
      store: {
        clearAnnotations: sinon.stub(),
        setCollapsed: sinon.stub(),
        highlightAnnotations: sinon.stub(),
        routeParams: sinon.stub().returns({ id: 'test_annotation_id' }),
        subscribe: sinon.stub(),
      },
      api: opts.api,
      rootThread: { thread: sinon.stub() },
      streamer: {
        setConfig: function() {},
        connect: function() {},
      },
      streamFilter: {
        addClause: function() {
          return {
            addClause: function() {},
          };
        },
        getFilter: function() {},
      },
      annotationMapper: {
        loadAnnotations: sinon.spy(),
      },
    };

    let $componentController;
    angular.mock.inject(function(_$componentController_) {
      $componentController = _$componentController_;
    });
    locals.ctrl = $componentController('annotationViewerContent', locals, {
      search: {},
    });
    return locals;
  }

  describe('the standalone view for a top-level annotation', function() {
    it('loads the annotation and all replies', function() {
      const fakeApi = new FakeApi([
        { id: 'test_annotation_id' },
        { id: 'test_reply_id', references: ['test_annotation_id'] },
      ]);
      const controller = createController({ api: fakeApi });
      return controller.ctrl.ready.then(function() {
        assert.calledOnce(controller.annotationMapper.loadAnnotations);
        assert.calledWith(
          controller.annotationMapper.loadAnnotations,
          sinon.match(fakeApi.annots)
        );
      });
    });

    it('does not highlight any annotations', function() {
      const fakeApi = new FakeApi([
        { id: 'test_annotation_id' },
        { id: 'test_reply_id', references: ['test_annotation_id'] },
      ]);
      const controller = createController({ api: fakeApi });
      return controller.ctrl.ready.then(function() {
        assert.notCalled(controller.store.highlightAnnotations);
      });
    });
  });

  describe('the standalone view for a reply', function() {
    it('loads the top-level annotation and all replies', function() {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);
      const controller = createController({ api: fakeApi });
      return controller.ctrl.ready.then(function() {
        assert.calledWith(
          controller.annotationMapper.loadAnnotations,
          sinon.match(fakeApi.annots)
        );
      });
    });

    it('expands the thread', function() {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);
      const controller = createController({ api: fakeApi });
      return controller.ctrl.ready.then(function() {
        assert.calledWith(controller.store.setCollapsed, 'parent_id', false);
        assert.calledWith(
          controller.store.setCollapsed,
          'test_annotation_id',
          false
        );
      });
    });

    it('highlights the reply', function() {
      const fakeApi = new FakeApi([
        { id: 'parent_id' },
        { id: 'test_annotation_id', references: ['parent_id'] },
      ]);
      const controller = createController({ api: fakeApi });
      return controller.ctrl.ready.then(function() {
        assert.calledWith(
          controller.store.highlightAnnotations,
          sinon.match(['test_annotation_id'])
        );
      });
    });
  });
});
