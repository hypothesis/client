import * as annotationFixtures from '../../test/annotation-fixtures';
import { immutable } from '../../util/immutable';
import { threadAnnotations, $imports } from '../thread-annotations';
import { sorters } from '../thread-sorters';

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

describe('sidebar/helpers/thread-annotations', () => {
  let fakeBuildThread;
  let fakeFilterAnnotations;
  let fakeQueryParser;
  let fakeThreadState;

  beforeEach(() => {
    fakeThreadState = {
      annotations: [],
      showTabs: true,
      selection: {
        expanded: {},
        forcedVisible: [],
        filters: {},
        filterQuery: null,
        selected: [],
        sortKey: 'Location',
        selectedTab: 'annotation',
      },
    };

    fakeBuildThread = sinon
      .stub()
      .callsFake(() => structuredClone(fixtures.emptyThread));
    fakeFilterAnnotations = sinon.stub();
    fakeQueryParser = {
      parseFilterQuery: sinon.stub(),
    };

    $imports.$mock({
      './build-thread': { buildThread: fakeBuildThread },
      './query-parser': fakeQueryParser,
      './filter-annotations': { filterAnnotations: fakeFilterAnnotations },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('threadAnnotations', () => {
    it('returns the result of buildThread', () => {
      assert.deepEqual(
        threadAnnotations(fakeThreadState).rootThread,
        fixtures.emptyThread,
      );
    });

    it('memoizes on `threadState`', () => {
      fakeBuildThread.onCall(0).returns({ children: [] });
      fakeBuildThread.onCall(1).returns({ children: [] });

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
        }),
      );
    });

    describe('when sort order changes', () => {
      ['Location', 'Oldest', 'Newest'].forEach(testCase => {
        it(`uses the appropriate sorting function when sorting by ${testCase}`, () => {
          fakeThreadState.selection.sortKey = testCase;

          threadAnnotations(fakeThreadState);

          // The sort compare fn passed to `buildThread`
          const sortCompareFn = fakeBuildThread.args[0][1].sortCompareFn;
          assert.equal(sortCompareFn, sorters[testCase]);
        });
      });
    });

    describe('annotation and thread filtering', () => {
      context('when `showTabs` is true', () => {
        function annotationForTab(tab) {
          switch (tab) {
            case 'annotation':
              return {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: false,
              };
            case 'note':
              return annotationFixtures.oldPageNote();
            case 'orphan':
              return {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: true,
              };
            default:
              throw new Error('Invalid tab');
          }
        }

        [
          // Tabs enabled, annotations in each tab.
          {
            annotations: [
              annotationForTab('annotation'),
              annotationForTab('annotation'),
              annotationForTab('annotation'),
              annotationForTab('note'),
              annotationForTab('note'),
              annotationForTab('orphan'),
            ],
            showTabs: true,
            expectedCounts: {
              annotation: 3,
              note: 2,
              orphan: 1,
            },
          },
          // Tabs enabled, no annotations
          {
            annotations: [],
            showTabs: true,
            expectedCounts: {
              annotation: 0,
              note: 0,
              orphan: 0,
            },
          },
          // Tabs disabled
          {
            annotations: [
              annotationForTab('annotation'),
              annotationForTab('note'),
              annotationForTab('orphan'),
            ],
            showTabs: false,
            expectedCounts: {
              annotation: 0,
              note: 0,
              orphan: 0,
            },
          },
        ].forEach(({ annotations, showTabs, expectedCounts }) => {
          it('returns thread count for each tab', () => {
            fakeThreadState.annotations = annotations;
            fakeBuildThread.returns({
              children: fakeThreadState.annotations.map(annotation => ({
                annotation,
              })),
            });
            fakeThreadState.showTabs = showTabs;
            fakeThreadState.selection.selectedTab = 'annotation';

            const { tabCounts } = threadAnnotations(fakeThreadState);

            assert.deepEqual(tabCounts, expectedCounts);
          });
        });

        ['note', 'annotation', 'orphan'].forEach(selectedTab => {
          it(`should filter the thread for the tab '${selectedTab}'`, () => {
            fakeThreadState.annotations = [
              {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: false,
              },
              annotationFixtures.oldPageNote(),
              {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: true,
              },
            ];
            fakeBuildThread.returns({
              children: fakeThreadState.annotations.map(annotation => ({
                annotation,
              })),
            });
            fakeThreadState.showTabs = true;
            fakeThreadState.selection.selectedTab = selectedTab;

            const { rootThread } = threadAnnotations(fakeThreadState);
            const filteredThreads = rootThread.children;

            assert.lengthOf(filteredThreads, 1);
            assert.equal(
              fakeThreadState.annotations.indexOf(
                filteredThreads[0].annotation,
              ),
              ['annotation', 'note', 'orphan'].indexOf(selectedTab),
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
        assert.calledOnce(fakeQueryParser.parseFilterQuery);
        assert.calledWith(
          fakeQueryParser.parseFilterQuery,
          fakeThreadState.selection.filterQuery,
          fakeThreadState.selection.filters,
        );
        assert.isTrue(filterFn(annotation));
      });

      it('should filter annotations if there is an applied focus filter', () => {
        fakeThreadState.selection.filters = { user: 'somebody' };

        threadAnnotations(fakeThreadState);

        assert.isFunction(fakeBuildThread.args[0][1].filterFn);
        assert.calledWith(
          fakeQueryParser.parseFilterQuery,
          sinon.match.any,
          sinon.match({ user: 'somebody' }),
        );
      });
    });
  });
});
