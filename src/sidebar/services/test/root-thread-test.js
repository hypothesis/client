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

describe('rootThreadService', function () {
  let fakeBuildThread;
  let fakeSearchFilter;
  let fakeStore;
  let fakeViewFilter;

  let rootThreadService;

  beforeEach(function () {
    fakeStore = {
      state: {},
      getState: function () {
        return this.state;
      },

      annotations: sinon.stub().returns([]),
      expandedThreads: sinon.stub().returns({}),
      filterQuery: sinon.stub(),
      focusModeFocused: sinon.stub().returns(false),
      focusModeUserId: sinon.stub().returns({}),
      forcedVisibleAnnotations: sinon.stub().returns([]),
      highlightAnnotations: sinon.stub(),
      highlightedAnnotations: sinon.stub().returns([]),
      route: sinon.stub().returns('sidebar'),
      selectedAnnotations: sinon.stub().returns([]),
      selectedTab: sinon.stub(),
      sortKey: sinon.stub(),
    };

    fakeBuildThread = sinon.stub().returns(fixtures.emptyThread);

    fakeSearchFilter = {
      generateFacetedFilter: sinon.stub(),
    };

    fakeViewFilter = {
      filter: sinon.stub(),
    };

    rootThreadService = new Injector()
      .register('store', { value: fakeStore })
      .register('searchFilter', { value: fakeSearchFilter })
      .register('viewFilter', { value: fakeViewFilter })
      .register('rootThreadService', rootThreadFactory)
      .get('rootThreadService');
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
      assert.equal(
        rootThreadService.thread(fakeStore.state),
        fixtures.emptyThread
      );
    });

    it('passes loaded annotations to buildThread()', function () {
      const annotation = annotationFixtures.defaultAnnotation();
      fakeStore.annotations.returns([annotation]);
      rootThreadService.thread(fakeStore.state);
      assert.calledWith(fakeBuildThread, sinon.match([annotation]));
    });

    it('passes the current selection to buildThread()', function () {
      fakeStore.selectedAnnotations.returns(['id1', 'id2']);
      rootThreadService.thread(fakeStore.state);
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
      rootThreadService.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          expanded: { id1: true, id2: true },
        })
      );
    });

    it('passes the current force-visible set to buildThread()', function () {
      fakeStore.forcedVisibleAnnotations.returns(['id1', 'id2']);
      rootThreadService.thread(fakeStore.state);
      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          forceVisible: ['id1', 'id2'],
        })
      );
    });

    it('passes the highlighted set to buildThread()', function () {
      fakeStore.highlightedAnnotations.returns(['id1', 'id2']);
      rootThreadService.thread(fakeStore.state);
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
        fakeStore.sortKey.returns(testCase.order);

        rootThreadService.thread(fakeStore.state);
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
      fakeStore.selectedTab.returns(uiConstants.TAB_ANNOTATIONS);
      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const annotation = { target: [{ selector: {} }] };
      assert.isDefined(threadFilterFn({ annotation: annotation }));
    });

    it('filter matches only notes when Notes tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isTrue(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter matches only orphans when Orphans tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.selectedTab.returns(uiConstants.TAB_ORPHANS);
      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      const orphan = Object.assign(annotationFixtures.defaultAnnotation(), {
        $orphan: true,
      });

      assert.isTrue(threadFilterFn({ annotation: orphan }));
    });

    it('filter does not match notes when Annotations tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.selectedTab.returns(uiConstants.TAB_ANNOTATIONS);
      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { target: [{}] } }));
    });

    it('filter does not match orphans when Annotations tab is selected', function () {
      fakeBuildThread.reset();
      fakeStore.selectedTab(uiConstants.TAB_ANNOTATIONS);
      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      assert.isFalse(threadFilterFn({ annotation: { $orphan: true } }));
    });

    it('does not filter annotations when not in the sidebar', function () {
      fakeBuildThread.reset();
      fakeStore.route.returns('stream');

      rootThreadService.thread(fakeStore.state);
      const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;

      // There should be no thread filter function on the stream and standalone
      // pages, since we show all types of annotations here
      assert.notOk(threadFilterFn);
    });

    it('filter returns false when no annotations are provided', function () {
      fakeBuildThread.reset();
      rootThreadService.thread(fakeStore.state);
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
      fakeStore.filterQuery.returns('queryterm');

      rootThreadService.thread(fakeStore.state);
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
      rootThreadService.thread(fakeStore.state);
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
