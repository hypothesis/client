'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const SearchStatusBar = require('../search-status-bar');

describe('SearchStatusBar', () => {
  let fakeRootThread;
  let fakeStore;

  function createComponent(props) {
    return shallow(
      <SearchStatusBar rootThread={fakeRootThread} {...props} />
    ).dive(); // dive() needed because this component uses `withServices`
  }

  beforeEach(() => {
    fakeRootThread = {
      thread: sinon.stub().returns({ children: [] }),
    };
    fakeStore = {
      getState: sinon.stub(),
      getRootState: sinon.stub().returns({
        selection: {},
        directLinked: {},
      }),
      annotationCount: sinon.stub().returns(1),
      focusModeFocused: sinon.stub().returns(false),
      focusModeUserPrettyName: sinon.stub().returns('Fake User'),
      noteCount: sinon.stub().returns(0),
    };

    SearchStatusBar.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    SearchStatusBar.$imports.$restore();
  });

  [
    {
      description:
        'shows correct text if 2 annotations match the search filter',
      children: [
        {
          id: '1',
          visible: true,
          children: [{ id: '3', visible: true, children: [] }],
        },
        {
          id: '2',
          visible: false,
          children: [],
        },
      ],
      expectedText: '2 search results',
    },
    {
      description:
        'shows correct text if 1 annotation matches the search filter',
      children: [
        {
          id: '1',
          visible: true,
          children: [{ id: '3', visible: false, children: [] }],
        },
        {
          id: '2',
          visible: false,
          children: [],
        },
      ],
      expectedText: '1 search result',
    },
    {
      description:
        'shows correct text if no annotation matches the search filter',
      children: [
        {
          id: '1',
          visible: false,
          children: [{ id: '3', visible: false, children: [] }],
        },
        {
          id: '2',
          visible: false,
          children: [],
        },
      ],
      expectedText: 'No results for "tag:foo"',
    },
  ].forEach(test => {
    it(test.description, () => {
      fakeRootThread.thread.returns({
        children: test.children,
      });
      fakeStore.getRootState.returns({
        selection: {
          filterQuery: 'tag:foo',
          selectedTab: 'annotation',
        },
        directLinked: {
          directLinkedGroupFetchFailed: false,
        },
      });
      fakeStore.annotationCount.returns(3);

      const wrapper = createComponent({});

      const buttonText = wrapper.find('button').text();
      assert.equal(buttonText, 'Clear search');

      const searchResultsText = wrapper.find('span').text();
      assert.equal(searchResultsText, test.expectedText);
    });
  });

  context('user-focused mode applied', () => {
    beforeEach(() => {
      fakeStore.focusModeFocused = sinon.stub().returns(true);
    });

    it('should not display a clear/show-all-annotations button when user-focused', () => {
      const wrapper = createComponent({});

      const buttons = wrapper.find('button');
      assert.equal(buttons.length, 0);
    });
    [
      {
        description:
          'shows pluralized annotation count when multiple annotations match for user',
        children: [
          { id: '1', visible: true, children: [] },
          { id: '2', visible: true, children: [] },
        ],
        expected: 'Showing 2 annotations',
      },
      {
        description:
          'shows single annotation count when one annotation matches for user',
        children: [{ id: '1', visible: true, children: [] }],
        expected: 'Showing 1 annotation',
      },
      {
        description:
          'shows "no annotations" wording when no annotations match for user',
        children: [],
        expected: 'No annotations for Fake User',
      },
    ].forEach(test => {
      it(test.description, () => {
        fakeRootThread.thread.returns({
          children: test.children,
        });
        const wrapper = createComponent({});
        const resultText = wrapper.find('strong').text();

        assert.equal(resultText, test.expected);
      });
    });
  });

  it('displays "Show all annotations" button when a direct-linked group fetch fails', () => {
    fakeStore.getRootState.returns({
      selection: {
        filterQuery: null,
        selectedAnnotationMap: { annId: true },
        selectedTab: 'annotation',
      },
      directLinked: {},
    });

    const wrapper = createComponent({});

    const buttonText = wrapper.find('button').text();
    assert.equal(buttonText, 'Show all annotations');
  });

  it('displays "Show all annotations" button when there are selected annotations', () => {
    fakeStore.getRootState.returns({
      selection: {
        filterQuery: null,
        selectedAnnotationMap: { annId: true },
        selectedTab: 'annotation',
      },
      directLinked: {
        directLinkedGroupFetchFailed: false,
      },
    });

    const wrapper = createComponent({});

    const buttonText = wrapper.find('button').text();
    assert.equal(buttonText, 'Show all annotations');
  });

  [null, {}].forEach(selectedAnnotationMap => {
    it('does not display "Show all annotations" button when there are no selected annotations', () => {
      fakeStore.getRootState.returns({
        selection: {
          filterQuery: null,
          selectedAnnotationMap: selectedAnnotationMap,
          selectedTab: 'annotation',
        },
        directLinked: {
          directLinkedGroupFetchFailed: false,
        },
      });

      const wrapper = createComponent({});

      const buttons = wrapper.find('button');
      assert.equal(buttons.length, 0);
    });
  });

  [
    {
      description:
        'displays "Show all annotations and notes" button when the orphans tab is selected',
      selectedTab: 'orphan',
      totalAnnotations: 1,
      totalNotes: 1,
      expectedText: 'Show all annotations and notes',
    },
    {
      description:
        'displays "Show all notes" button when the notes tab is selected',
      selectedTab: 'note',
      totalAnnotations: 1,
      totalNotes: 1,
      expectedText: 'Show all notes',
    },
    {
      description:
        'displays "Show all notes (2)" button when the notes tab is selected and there are two notes',
      selectedTab: 'note',
      totalAnnotations: 2,
      totalNotes: 2,
      expectedText: 'Show all notes (2)',
    },
    {
      description:
        'displays "Show all annotations (2)" button when the notes tab is selected and there are two annotations',
      selectedTab: 'annotation',
      totalAnnotations: 2,
      totalNotes: 2,
      expectedText: 'Show all annotations (2)',
    },
  ].forEach(test => {
    it(test.description, () => {
      fakeStore.getRootState.returns({
        selection: {
          filterQuery: null,
          selectedAnnotationMap: { annId: true },
          selectedTab: test.selectedTab,
        },
        directLinked: {
          directLinkedGroupFetchFailed: false,
        },
      });
      fakeStore.noteCount.returns(test.totalNotes);
      fakeStore.annotationCount.returns(test.totalAnnotations);

      const wrapper = createComponent({});

      const buttonText = wrapper.find('button').text();
      assert.equal(buttonText, test.expectedText);
    });
  });
});
