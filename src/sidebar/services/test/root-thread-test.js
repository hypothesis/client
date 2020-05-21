import { Injector } from '../../../shared/injector';
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

describe('rootThread', function () {
  let fakeAnnotationsService;
  let fakeBuildThread;
  let fakeSearchFilter;
  let fakeSettings;
  let fakeStore;
  let fakeViewFilter;

  let rootThread;

  beforeEach(function () {
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
          filterQuery: null,
          forceVisible: {},
          highlighted: [],
          sortKey: 'Location',
          sortKeysAvailable: ['Location'],
        },
        route: {
          name: 'sidebar',
          params: {},
        },
      },
      getState: function () {
        return this.state;
      },

      expandedThreads: sinon.stub().returns({}),
      getSelectedAnnotationMap: sinon.stub().returns(null),
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

    rootThread = new Injector()
      .register('annotationsService', { value: fakeAnnotationsService })
      .register('store', { value: fakeStore })
      .register('searchFilter', { value: fakeSearchFilter })
      .register('settings', { value: fakeSettings })
      .register('viewFilter', { value: fakeViewFilter })
      .register('rootThread', rootThreadFactory)
      .get('rootThread');
  });

  beforeEach(() => {
    $imports.$mock({
      '../build-thread': fakeBuildThread,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#thread', function () {
    it('returns the result of buildThread()', function () {
      assert.equal(rootThread.thread(fakeStore.state), fixtures.emptyThread);
    });

    it('passes loaded annotations to buildThread()', function () {
      const annotation = annotationFixtures.defaultAnnotation();
      fakeStore.state.annotations.annotations = [annotation];
      rootThread.thread(fakeStore.state);
      assert.calledWith(fakeBuildThread, sinon.match([annotation]));
    });

    it('passes the current selection to buildThread()', function () {
      fakeStore.getSelectedAnnotationMap.returns({
        id1: true,
        id2: true,
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

    it('passes the current expanded set to buildThread()', function () {
      fakeStore.expandedThreads.returns({ id1: true, id2: true });
      rootThread.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          expanded: { id1: true, id2: true },
        })
      );
    });

    it('passes the current force-visible set to buildThread()', function () {
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

    it('passes the highlighted set to buildThread()', function () {
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

  describe('when the sort order changes', function () {
    function sortBy(annotations, sortCompareFn) {
      return annotations.slice().sort(function (a, b) {
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
        const actualOrder = sortBy(annotations, sortCompareFn).map(function (
          annot
        ) {
          return annotations.indexOf(annot);
        });
        assert.deepEqual(actualOrder, testCase.expectedOrder);
      });
    });
  });

  describe('when no filter query is set', function () {
    it('filter matches only annotations when Annotations tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const annotation = { target: [{ selector: {} }] };
      assert.isDefined(threadFilterFn({ annotation: annotation }));
    });

    it('filter matches only notes when Notes tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_NOTES;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isTrue(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter matches only orphans when Orphans tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ORPHANS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const orphan = Object.assign(annotationFixtures.defaultAnnotation(), {
        $orphan: true,
      });

      assert.isTrue(threadFilterFn({ annotation: orphan }));
    });

    it('filter does not match notes when Annotations tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter does not match orphans when Annotations tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.state.selection.selectedTab = uiConstants.TAB_ANNOTATIONS;
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { $orphan: true } }));
    });

    it('does not filter annotations when not in the sidebar', function () {
      fakeBuildThread.reset();
      fakeStore.state.route.name = 'stream';

      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      // There should be no thread filter function on the stream and standalone
      // pages, since we show all types of annotations here
      assert.notOk(threadFilterFn);
    });

    it('filter returns false when no annotations are provided', function () {
      fakeBuildThread.reset();
      rootThread.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;
      assert.isFalse(threadFilterFn({}));
    });
  });

  describe('when the filter query changes', function () {
    it('generates a thread filter function from the query', function () {
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
});
