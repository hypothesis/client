import * as annotationFixtures from '../../test/annotation-fixtures';
import { immutable } from '../../util/immutable';
import { threadAnnotations, $imports } from '../thread-annotations';

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
  let fakeCompareThreads;
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
        sortKey: 'location',
        selectedTab: 'annotation',
      },
    };

    fakeCompareThreads = sinon.stub().returns(0);

    fakeBuildThread = sinon
      .stub()
      .callsFake(() => structuredClone(fixtures.emptyThread));
    fakeFilterAnnotations = sinon.stub();
    fakeQueryParser = {
      parseFilterQuery: sinon.stub().returns({}),
    };

    $imports.$mock({
      './build-thread': { buildThread: fakeBuildThread },
      './query-parser': fakeQueryParser,
      './filter-annotations': { filterAnnotations: fakeFilterAnnotations },
      './thread-sorters': { compareThreads: fakeCompareThreads },
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
      ['location', 'oldest', 'newest'].forEach(sortKey => {
        it(`uses the appropriate sorting function when sorting by ${sortKey}`, () => {
          fakeThreadState.selection.sortKey = sortKey;

          threadAnnotations(fakeThreadState);

          const sortCompareFn = fakeBuildThread.args[0][1].sortCompareFn;
          const threadA = {};
          const threadB = {};
          sortCompareFn(threadA, threadB);
          assert.calledWith(fakeCompareThreads, threadA, threadB, {
            sortBy: sortKey,
          });
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

              // Annotation waiting to anchor
              {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: undefined,
              },
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

        it('keeps threads as orphan, when the root annotation does not exist', () => {
          fakeBuildThread.returns({
            children: [
              {
                annotation: null,
                children: [annotationFixtures.oldReply()],
              },
            ],
          });
          fakeThreadState.showTabs = true;
          fakeThreadState.selection.selectedTab = 'orphan';

          const { tabCounts, rootThread } = threadAnnotations(fakeThreadState);
          assert.deepEqual(tabCounts, {
            annotation: 0,
            note: 0,
            orphan: 1,
          });
          assert.equal(rootThread.children.length, 1);
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
              // Annotation that is still anchoring. This should not appear on
              // any tab.
              {
                ...annotationFixtures.defaultAnnotation(),
                $orphan: undefined,
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
        fakeQueryParser.parseFilterQuery.returns({
          termA: { terms: ['bar'], filterReplies: true },
          termB: { terms: ['foo'], filterReplies: false },
        });
        const annotation = annotationFixtures.defaultAnnotation();
        fakeFilterAnnotations.returns([annotation]);

        threadAnnotations(fakeThreadState);

        assert.calledOnce(fakeQueryParser.parseFilterQuery);
        assert.calledWith(
          fakeQueryParser.parseFilterQuery,
          fakeThreadState.selection.filterQuery,
          fakeThreadState.selection.filters,
        );

        const filterFn = fakeBuildThread.args[0][1].filterFn;
        assert.isFunction(filterFn);
        assert.isTrue(filterFn(annotation));

        const threadFilterFn = fakeBuildThread.args[0][1].threadFilterFn;
        assert.isFunction(threadFilterFn);
        assert.isTrue(threadFilterFn({ annotation }));
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
