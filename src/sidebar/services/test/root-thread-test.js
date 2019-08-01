'use strict';

const angular = require('angular');
const immutable = require('seamless-immutable');

const annotationFixtures = require('../../test/annotation-fixtures');
const events = require('../../events');
const uiConstants = require('../../ui-constants');
const util = require('../../../shared/test/util');

const rootThreadFactory = require('../root-thread');

const unroll = util.unroll;

const fixtures = immutable({
  emptyThread: {
    annotation: undefined,
    children: [],
  },
  nonEmptyDraft: {
    text: 'Some text',
    tags: [],
    isPrivate: false,
  },
});

describe('rootThread', function() {
  let fakeStore;
  let fakeBuildThread;
  let fakeSearchFilter;
  let fakeSettings;
  let fakeViewFilter;

  let $rootScope;

  let rootThread;

  beforeEach(function() {
    fakeStore = {
      state: {
        annotations: [],
        expanded: {},
        drafts: [],
        filterQuery: null,
        focusedAnnotationMap: null,
        forceVisible: {},
        highlighted: [],
        isSidebar: true,
        selectedAnnotationMap: null,
        session: {
          features: {},
        },
        sortKey: 'Location',
        sortKeysAvailable: ['Location'],
        visibleHighlights: false,
      },
      getState: function() {
        return this.state;
      },
      subscribe: sinon.stub(),
      removeAnnotations: sinon.stub(),
      removeSelectedAnnotation: sinon.stub(),
      addAnnotations: sinon.stub(),
      setCollapsed: sinon.stub(),
      selectTab: sinon.stub(),
      getDraftIfNotEmpty: sinon.stub().returns(null),
      removeDraft: sinon.stub(),
      createAnnotation: sinon.stub(),
      focusModeFocused: sinon.stub().returns(false),
      focusModeUsername: sinon.stub().returns({}),
    };

    fakeBuildThread = sinon.stub().returns(fixtures.emptyThread);

    fakeSearchFilter = {
      generateFacetedFilter: sinon.stub(),
    };

    fakeSettings = {};

    fakeViewFilter = {
      filter: sinon.stub(),
    };

    angular
      .module('app', [])
      .value('store', fakeStore)
      .value('searchFilter', fakeSearchFilter)
      .value('settings', fakeSettings)
      .value('viewFilter', fakeViewFilter)
      .service('rootThread', rootThreadFactory);

    angular.mock.module('app');

    angular.mock.inject(function(_$rootScope_, _rootThread_) {
      $rootScope = _$rootScope_;
      rootThread = _rootThread_;
    });
  });

  beforeEach(() => {
    rootThreadFactory.$imports.$mock({
      '../build-thread': fakeBuildThread,
    });
  });

  afterEach(() => {
    rootThreadFactory.$imports.$restore();
  });

  describe('#thread', function() {
    it('returns the result of buildThread()', function() {
      assert.equal(rootThread.thread(fakeStore.state), fixtures.emptyThread);
    });

    it('passes loaded annotations to buildThread()', function() {
      const annotation = annotationFixtures.defaultAnnotation();
      fakeStore.state = Object.assign({}, fakeStore.state, {
        annotations: [annotation],
      });
      rootThread.thread(fakeStore.state);
      assert.calledWith(fakeBuildThread, sinon.match([annotation]));
    });

    it('passes the current selection to buildThread()', function() {
      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedAnnotationMap: { id1: true, id2: true },
      });
      rootThread.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          selected: ['id1', 'id2'],
        })
      );
    });

    it('passes the current expanded set to buildThread()', function() {
      fakeStore.state = Object.assign({}, fakeStore.state, {
        expanded: { id1: true, id2: true },
      });
      rootThread.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          expanded: { id1: true, id2: true },
        })
      );
    });

    it('passes the current force-visible set to buildThread()', function() {
      fakeStore.state = Object.assign({}, fakeStore.state, {
        forceVisible: { id1: true, id2: true },
      });
      rootThread.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          forceVisible: ['id1', 'id2'],
        })
      );
    });

    it('passes the highlighted set to buildThread()', function() {
      fakeStore.state = Object.assign({}, fakeStore.state, {
        highlighted: ['id1', 'id2'],
      });
      rootThread.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          highlighted: ['id1', 'id2'],
        })
      );
    });
  });

  describe('when the sort order changes', function() {
    function sortBy(annotations, sortCompareFn) {
      return annotations.slice().sort(function(a, b) {
        return sortCompareFn(a, b) ? -1 : sortCompareFn(b, a) ? 1 : 0;
      });
    }

    function targetWithPos(pos) {
      return [
        {
          selector: [{ type: 'TextPositionSelector', start: pos }],
        },
      ];
    }

    unroll(
      'sort order is correct when sorting by #order',
      function(testCase) {
        const annotations = [
          {
            target: targetWithPos(1),
            updated: 20,
          },
          {
            target: targetWithPos(100),
            updated: 100,
          },
          {
            target: targetWithPos(50),
            updated: 50,
          },
          {
            target: targetWithPos(20),
            updated: 10,
          },
        ];

        fakeBuildThread.reset();
        fakeStore.state = Object.assign({}, fakeStore.state, {
          sortKey: testCase.order,
          sortKeysAvailable: [testCase.order],
        });
        rootThread.thread(fakeStore.state);
        const sortCompareFn = fakeBuildThread.args[0][1].sortCompareFn;
        const actualOrder = sortBy(annotations, sortCompareFn).map(function(
          annot
        ) {
          return annotations.indexOf(annot);
        });
        assert.deepEqual(actualOrder, testCase.expectedOrder);
      },
      [
        { order: 'Location', expectedOrder: [0, 3, 2, 1] },
        { order: 'Oldest', expectedOrder: [3, 0, 2, 1] },
        { order: 'Newest', expectedOrder: [1, 2, 0, 3] },
      ]
    );
  });

  describe('when no filter query is set', function() {
    it('filter matches only annotations when Annotations tab is selected', function() {
      fakeBuildThread.reset();

      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedTab: uiConstants.TAB_ANNOTATIONS,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const annotation = { target: [{ selector: {} }] };
      assert.isDefined(threadFilterFn({ annotation: annotation }));
    });

    it('filter matches only notes when Notes tab is selected', function() {
      fakeBuildThread.reset();

      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedTab: uiConstants.TAB_NOTES,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isTrue(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter matches only orphans when Orphans tab is selected', function() {
      fakeBuildThread.reset();

      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedTab: uiConstants.TAB_ORPHANS,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const orphan = Object.assign(annotationFixtures.defaultAnnotation(), {
        $orphan: true,
      });

      assert.isTrue(threadFilterFn({ annotation: orphan }));
    });

    it('filter does not match notes when Annotations tab is selected', function() {
      fakeBuildThread.reset();

      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedTab: uiConstants.TAB_ANNOTATIONS,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter does not match orphans when Annotations tab is selected', function() {
      fakeBuildThread.reset();

      fakeStore.state = Object.assign({}, fakeStore.state, {
        selectedTab: uiConstants.TAB_ANNOTATIONS,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { $orphan: true } }));
    });

    it('does not filter annotations when not in the sidebar', function() {
      fakeBuildThread.reset();
      fakeStore.state = Object.assign({}, fakeStore.state, {
        isSidebar: false,
      });

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      // There should be no thread filter function on the stream and standalone
      // pages, since we show all types of annotations here
      assert.notOk(threadFilterFn);
    });
  });

  describe('when the filter query changes', function() {
    it('generates a thread filter function from the query', function() {
      fakeBuildThread.reset();
      const filters = [{ any: { terms: ['queryterm'] } }];
      const annotation = annotationFixtures.defaultAnnotation();
      fakeSearchFilter.generateFacetedFilter.returns(filters);
      fakeStore.state = Object.assign({}, fakeStore.state, {
        filterQuery: 'queryterm',
      });
      rootThread.thread(fakeStore.state);
      const filterFn = fakeBuildThread.args[0][1].filterFn;

      fakeViewFilter.filter.returns([annotation]);
      assert.isTrue(filterFn(annotation));
      assert.calledWith(
        fakeViewFilter.filter,
        sinon.match([annotation]),
        filters
      );
    });
  });

  describe('when the focus user is present', () => {
    it("generates a thread filter focused on the user's annotations", () => {
      fakeBuildThread.reset();
      const filters = [{ user: { terms: ['acct:bill@localhost'] } }];
      const annotation = annotationFixtures.defaultAnnotation();
      fakeSearchFilter.generateFacetedFilter.returns(filters);
      fakeStore.focusModeFocused = sinon.stub().returns(true);
      rootThread.thread(fakeStore.state);
      const filterFn = fakeBuildThread.args[0][1].filterFn;

      fakeViewFilter.filter.returns([annotation]);
      assert.isTrue(filterFn(annotation));
      assert.calledWith(
        fakeViewFilter.filter,
        sinon.match([annotation]),
        filters
      );
    });
  });

  context('when annotation events occur', function() {
    const annot = annotationFixtures.defaultAnnotation();

    it('creates a new annotation in the store when BEFORE_ANNOTATION_CREATED event occurs', function() {
      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
      assert.notCalled(fakeStore.removeAnnotations);
      assert.calledWith(fakeStore.createAnnotation, sinon.match(annot));
    });

    unroll(
      'adds or updates annotations when #event event occurs',
      function(testCase) {
        $rootScope.$broadcast(testCase.event, testCase.annotations);
        const annotations = [].concat(testCase.annotations);
        assert.notCalled(fakeStore.removeAnnotations);
        assert.calledWith(fakeStore.addAnnotations, sinon.match(annotations));
      },
      [
        { event: events.ANNOTATION_CREATED, annotations: annot },
        { event: events.ANNOTATION_UPDATED, annotations: annot },
        { event: events.ANNOTATIONS_LOADED, annotations: [annot] },
      ]
    );

    it('removes annotations when ANNOTATION_DELETED event occurs', function() {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, annot);
      assert.calledWith(fakeStore.removeAnnotations, sinon.match([annot]));
    });

    it('removes annotations when ANNOTATIONS_UNLOADED event occurs', function() {
      $rootScope.$broadcast(events.ANNOTATIONS_UNLOADED, annot);
      assert.calledWith(fakeStore.removeAnnotations, sinon.match(annot));
    });

    describe('when a new annotation is created', function() {
      let existingNewAnnot;
      let onDelete;
      beforeEach(function() {
        onDelete = sinon.stub();
        $rootScope.$on(events.ANNOTATION_DELETED, onDelete);

        existingNewAnnot = { $tag: 'a-new-tag' };
        fakeStore.state.annotations.push(existingNewAnnot);
      });

      it('does not remove annotations that have non-empty drafts', function() {
        fakeStore.getDraftIfNotEmpty.returns(fixtures.nonEmptyDraft);

        $rootScope.$broadcast(
          events.BEFORE_ANNOTATION_CREATED,
          annotationFixtures.newAnnotation()
        );

        assert.notCalled(fakeStore.removeDraft);
        assert.notCalled(onDelete);
      });

      it('does not remove saved annotations', function() {
        const ann = annotationFixtures.defaultAnnotation();
        fakeStore.state.annotations = [ann];

        $rootScope.$broadcast(
          events.BEFORE_ANNOTATION_CREATED,
          annotationFixtures.newAnnotation()
        );

        assert.notCalled(fakeStore.removeDraft);
        assert.notCalled(onDelete);
      });
    });
  });

  describe('when the focused group changes', function() {
    it('moves new annotations to the focused group', function() {
      fakeStore.state.annotations = [{ $tag: 'a-tag' }];

      $rootScope.$broadcast(events.GROUP_FOCUSED, 'private-group');

      assert.calledWith(
        fakeStore.addAnnotations,
        sinon.match([
          {
            $tag: 'a-tag',
            group: 'private-group',
          },
        ])
      );
    });

    it('does not move replies to the new group', function() {
      fakeStore.state.annotations = [annotationFixtures.newReply()];

      $rootScope.$broadcast(events.GROUP_FOCUSED, 'private-group');

      assert.notCalled(fakeStore.addAnnotations);
    });

    it('does not move saved annotations to the new group', function() {
      fakeStore.state.annotations = [annotationFixtures.defaultAnnotation()];

      $rootScope.$broadcast(events.GROUP_FOCUSED, 'private-group');

      assert.notCalled(fakeStore.addAnnotations);
    });
  });
});
