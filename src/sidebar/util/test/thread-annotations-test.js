import * as annotationFixtures from '../../test/annotation-fixtures';
import uiConstants from '../../ui-constants';
import threadAnnotations from '../thread-annotations';
import { $imports } from '../thread-annotations';
import immutable from '../immutable';

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

describe('sidebar/utils/thread-annotations', () => {
  let fakeBuildThread;
  let fakeFilterAnnotations;
  let fakeSearchFilter;
  let fakeThreadState;

  beforeEach(() => {
    fakeThreadState = {
      annotations: [],
      route: 'sidebar',
      selection: {
        expanded: {},
        forcedVisible: [],
        filters: {},
        filterQuery: null,
        selected: [],
        sortKey: 'Location',
        selectedTab: uiConstants.TAB_ANNOTATION,
      },
    };

    fakeBuildThread = sinon.stub().returns(fixtures.emptyThread);
    fakeFilterAnnotations = sinon.stub();
    fakeSearchFilter = {
      generateFacetedFilter: sinon.stub(),
    };

    $imports.$mock({
      './build-thread': fakeBuildThread,
      './search-filter': fakeSearchFilter,
      './view-filter': fakeFilterAnnotations,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('threadAnnotations', () => {
    it('returns the result of buildThread', () => {
      assert.equal(threadAnnotations(fakeThreadState), fixtures.emptyThread);
    });

    it('memoizes on `threadState`', () => {
      fakeBuildThread.onCall(0).returns({ brisket: 'fingers' });
      fakeBuildThread.onCall(1).returns({ brisket: 'bananas' });

      const thread1 = threadAnnotations(fakeThreadState);
      const thread2 = threadAnnotations(fakeThreadState);

      assert.calledOnce(fakeBuildThread);
      assert.strictEqual(thread1, thread2);

      fakeThreadState = { ...fakeThreadState };

      const thread3 = threadAnnotations(fakeThreadState);

      assert.calledTwice(fakeBuildThread);
      assert.notStrictEqual(thread2, thread3);
    });

    it('passes annotations to buildThread', () => {
      const annotation = annotationFixtures.defaultAnnotation();
      fakeThreadState.annotations = [annotation];

      threadAnnotations(fakeThreadState);
      assert.calledWith(fakeBuildThread, sinon.match([annotation]));
    });

    it('passes on annotation states to buildThread as options', () => {
      threadAnnotations(fakeThreadState);

      assert.calledWith(
        fakeBuildThread,
        [],
        sinon.match({
          expanded: fakeThreadState.selection.expanded,
          forcedVisible: fakeThreadState.selection.forcedVisible,
          selected: fakeThreadState.selection.selected,
        })
      );
    });

    describe('when sort order changes', () => {
      function sortBy(annotations, sortCompareFn) {
        return annotations.slice().sort((a, b) => {
          if (sortCompareFn(a, b)) {
            return -1;
          }
          return sortCompareFn(b, a) ? 1 : 0;
        });
      }

      // Format TextPositionSelector for the given position `pos`
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
        it(`sorts correctly when sorting by ${testCase.order}`, () => {
          fakeThreadState.selection.sortKey = testCase.order;

          threadAnnotations(fakeThreadState);

          // The sort compare fn passed to `buildThread`
          const sortCompareFn = fakeBuildThread.args[0][1].sortCompareFn;

          // Sort the test annotations by the sort compare fn that would be
          // used by `build-thread` and make sure it's as expected
          const actualOrder = sortBy(annotations, sortCompareFn).map(annot =>
            annotations.indexOf(annot)
          );
          assert.deepEqual(actualOrder, testCase.expectedOrder);
        });
      });
    });

    describe('annotation and thread filtering', () => {
      context('sidebar route', () => {
        [
          uiConstants.TAB_NOTES,
          uiConstants.TAB_ANNOTATIONS,
          uiConstants.TAB_ORPHANS,
        ].forEach(selectedTab => {
          it(`should filter the thread for the tab '${selectedTab}'`, () => {
            const annotations = {
              [uiConstants.TAB_ANNOTATIONS]: {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: false,
              },
              [uiConstants.TAB_NOTES]: annotationFixtures.oldPageNote(),
              [uiConstants.TAB_ORPHANS]: {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: true,
              },
            };
            const fakeThreads = [
              {},
              { annotation: annotations[uiConstants.TAB_ANNOTATIONS] },
              { annotation: annotations[uiConstants.TAB_NOTES] },
              { annotation: annotations[uiConstants.TAB_ORPHANS] },
            ];
            fakeThreadState.selection.selectedTab = selectedTab;

            threadAnnotations(fakeThreadState);

            const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;
            const filteredThreads = fakeThreads.filter(thread =>
              threadFilterFn(thread)
            );

            assert.lengthOf(filteredThreads, 1);
            assert.equal(
              filteredThreads[0].annotation,
              annotations[selectedTab]
            );
          });
        });

        it('should not filter the thread if annotations are filtered', () => {
          fakeThreadState.selection.filterQuery = 'foo';

          threadAnnotations(fakeThreadState);

          assert.isUndefined(fakeBuildThread.args[0][1].threadFilterFn);
        });

        it('should not filter the thread if there are applied focus filters', () => {
          fakeThreadState.selection.filters = { user: 'someusername' };

          threadAnnotations(fakeThreadState);

          assert.isUndefined(fakeBuildThread.args[0][1].threadFilterFn);
        });
      });

      context('other routes', () => {
        it('should not filter the thread', () => {
          fakeThreadState.route = 'nonsense';

          threadAnnotations(fakeThreadState);

          assert.isUndefined(fakeBuildThread.args[0][1].threadFilterFn);
        });
      });

      it('should filter annotations if a filter query is set', () => {
        fakeThreadState.selection.filterQuery = 'anything';
        const annotation = annotationFixtures.defaultAnnotation();
        fakeFilterAnnotations.returns([annotation]);

        threadAnnotations(fakeThreadState);

        const filterFn = fakeBuildThread.args[0][1].filterFn;

        assert.isFunction(filterFn);
        assert.calledOnce(fakeSearchFilter.generateFacetedFilter);
        assert.calledWith(
          fakeSearchFilter.generateFacetedFilter,
          fakeThreadState.selection.filterQuery,
          fakeThreadState.selection.filters
        );
        assert.isTrue(filterFn(annotation));
      });

      it('should filter annotations if there is an applied focus filter', () => {
        fakeThreadState.selection.filters = { user: 'somebody' };

        threadAnnotations(fakeThreadState);

        assert.isFunction(fakeBuildThread.args[0][1].filterFn);
        assert.calledWith(
          fakeSearchFilter.generateFacetedFilter,
          sinon.match.any,
          sinon.match({ user: 'somebody' })
        );
      });
    });
  });
});
