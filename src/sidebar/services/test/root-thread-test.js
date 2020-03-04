import angular from 'angular';

import events from '../../events';
import * as annotationFixtures from '../../test/annotation-fixtures';
import uiConstants from '../../ui-constants';
import rootThreadFactory from '../root-thread';
import { $imports } from '../root-thread';
import immutable from '../../util/immutable';

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
  let fakeAnnotationsService;
  let fakeStore;
  let fakeBuildThread;
  let fakeSearchFilter;
  let fakeSettings;
  let fakeViewFilter;

  let $rootScope;

  let rootThread;

  beforeEach(function() {
    fakeAnnotationsService = {
      create: sinon.stub(),
    };
    fakeStore = {
      state: {
        annotations: {
          annotations: [],
        },
        viewer: {
          visibleHighlights: false,
        },
        drafts: [],
        selection: {
          expanded: {},
          filterQuery: null,
          focusedAnnotationMap: null,
          forceVisible: {},
          highlighted: [],
          selectedAnnotationMap: null,
          sortKey: 'Location',
          sortKeysAvailable: ['Location'],
        },
        route: {
          name: 'sidebar',
          params: {},
        },
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
      focusModeUserId: sinon.stub().returns({}),
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
      .value('annotationsService', fakeAnnotationsService)
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
    $imports.$mock({
      '../build-thread': fakeBuildThread,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#thread', function() {
    it('returns the result of buildThread()', function() {
      assert.equal(rootThread.thread(fakeStore.state), fixtures.emptyThread);
    });

    it('passes loaded annotations to buildThread()', function() {
      const annotation = annotationFixtures.defaultAnnotation();
      fakeStore.state.annotations.annotations = [annotation];
      rootThread.thread(fakeStore.state);
      assert.calledWith(fakeBuildThread, sinon.match([annotation]));
    });

    it('passes the current selection to buildThread()', function() {
      fakeStore.state.selection.selectedAnnotationMap = {
        id1: true,
        id2: true,
      };
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
      fakeStore.state.selection.expanded = { id1: true, id2: true };
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
      fakeStore.state.selection.forceVisible = { id1: true, id2: true };
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
      fakeStore.state.selection.highlighted = ['id1', 'id2'];
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

    [
      {
        order: 'Location',
        expectedOrder: [0, 3, 2, 1],
      },
      {
        order: 'Oldest',
        expectedOrder: [3, 0, 2, 1],
      },
      {
        order: 'Newest',
        expectedOrder: [1, 2, 0, 3],
      },
    ].forEach(testCase => {
      it(`sort order is correct when sorting by ${testCase.order}`, () => {
        fakeBuildThread.reset();
        fakeStore.state.selection.sortKey = testCase.order;
        fakeStore.state.selection.sortKeysAvailable = [testCase.order];

        rootThread.thread(fakeStore.state);
        const sortCompareFn = fakeBuildThread.args[0][1].sortCompareFn;
        const actualOrder = sortBy(annotations, sortCompareFn).map(function(
          annot
        ) {
          return annotations.indexOf(annot);
        });
        assert.deepEqual(actualOrder, testCase.expectedOrder);
      });
    });
  });

  describe('when no filter query is set', function() {
    it('filter matches only annotations when Annotations tab is selected', function() {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const annotation = { target: [{ selector: {} }] };
      assert.isDefined(threadFilterFn({ annotation: annotation }));
    });

    it('filter matches only notes when Notes tab is selected', function() {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_NOTES;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isTrue(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter matches only orphans when Orphans tab is selected', function() {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ORPHANS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const orphan = Object.assign(annotationFixtures.defaultAnnotation(), {
        $orphan: true,
      });

      assert.isTrue(threadFilterFn({ annotation: orphan }));
    });

    it('filter does not match notes when Annotations tab is selected', function() {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter does not match orphans when Annotations tab is selected', function() {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { $orphan: true } }));
    });

    it('does not filter annotations when not in the sidebar', function() {
      fakeBuildThread.reset();
      fakeStore.state.route.name = 'stream';

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      // There should be no thread filter function on the stream and standalone
      // pages, since we show all types of annotations here
      assert.notOk(threadFilterFn);
    });

    it('filter returns false when no annotations are provided', function() {
      fakeBuildThread.reset();
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;
      assert.isFalse(threadFilterFn({}));
    });
  });

  describe('when the filter query changes', function() {
    it('generates a thread filter function from the query', function() {
      fakeBuildThread.reset();
      const filters = [{ any: { terms: ['queryterm'] } }];
      const annotation = annotationFixtures.defaultAnnotation();
      fakeSearchFilter.generateFacetedFilter.returns(filters);
      fakeStore.state.selection.filterQuery = 'queryterm';

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

    it('creates a new annotation when BEFORE_ANNOTATION_CREATED event occurs', function() {
      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
      assert.notCalled(fakeStore.removeAnnotations);
      assert.calledWith(fakeAnnotationsService.create, sinon.match(annot));
    });

    [
      { event: events.ANNOTATION_CREATED, annotations: annot },
      { event: events.ANNOTATION_UPDATED, annotations: annot },
      { event: events.ANNOTATIONS_LOADED, annotations: [annot] },
    ].forEach(testCase => {
      it(`adds or updates annotations when ${testCase.event} event occurs`, () => {
        $rootScope.$broadcast(testCase.event, testCase.annotations);
        const annotations = [].concat(testCase.annotations);
        assert.notCalled(fakeStore.removeAnnotations);
        assert.calledWith(fakeStore.addAnnotations, sinon.match(annotations));
      });
    });

    it('removes annotations when ANNOTATION_DELETED event occurs', function() {
      $rootScope.$broadcast(events.ANNOTATION_DELETED, annot);
      assert.calledWith(fakeStore.removeAnnotations, sinon.match([annot]));
    });

    describe('when a new annotation is created', function() {
      let existingNewAnnot;
      let onDelete;
      beforeEach(function() {
        onDelete = sinon.stub();
        $rootScope.$on(events.ANNOTATION_DELETED, onDelete);

        existingNewAnnot = { $tag: 'a-new-tag' };
        fakeStore.state.annotations.annotations.push(existingNewAnnot);
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
        fakeStore.state.annotations.annotations = [ann];

        $rootScope.$broadcast(
          events.BEFORE_ANNOTATION_CREATED,
          annotationFixtures.newAnnotation()
        );

        assert.notCalled(fakeStore.removeDraft);
        assert.notCalled(onDelete);
      });
    });
  });
});
