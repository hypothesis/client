import { mount } from 'enzyme';
import { createElement } from 'preact';

import SearchStatusBar from '../search-status-bar';
import { $imports } from '../search-status-bar';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('SearchStatusBar', () => {
  let fakeRootThreadService;
  let fakeStore;

  function createComponent(props) {
    return mount(
      <SearchStatusBar rootThreadService={fakeRootThreadService} {...props} />
    );
  }

  beforeEach(() => {
    fakeRootThreadService = {
      thread: sinon.stub().returns({ children: [] }),
    };
    fakeStore = {
      getState: sinon.stub().returns({
        selection: {},
      }),
      annotationCount: sinon.stub().returns(1),
      focusModeFocused: sinon.stub().returns(false),
      focusModeUserPrettyName: sinon.stub().returns('Fake User'),
      getSelectedAnnotationMap: sinon.stub(),
      noteCount: sinon.stub().returns(0),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('user search query is applied', () => {
    beforeEach(() => {
      fakeStore.getState.returns({
        selection: {
          filterQuery: 'tag:foo',
          selectedTab: 'annotation',
        },
      });
      fakeStore.annotationCount.returns(3);
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
        fakeRootThreadService.thread.returns({
          children: test.children,
        });

        const wrapper = createComponent({});

        const button = wrapper.find('Button');
        assert.equal(button.props().buttonText, 'Clear search');

        const searchResultsText = wrapper.find('span').text();
        assert.equal(searchResultsText, test.expectedText);
      });
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
        fakeRootThreadService.thread.returns({
          children: test.children,
        });
        const wrapper = createComponent({});
        const resultText = wrapper
          .find('.search-status-bar__focused-text')
          .text();

        assert.equal(resultText, test.expected);
      });
    });

    it('should not display user-focused mode text if filtered mode is (also) applied', () => {
      fakeRootThreadService.thread.returns({
        children: [
          { id: '1', visible: true, children: [] },
          { id: '2', visible: true, children: [] },
        ],
      });

      fakeStore.getState.returns({
        selection: {
          filterQuery: 'tag:foo',
          selectedTab: 'annotation',
        },
      });

      const wrapper = createComponent({});

      const focusedTextEl = wrapper.find('.search-status-bar__focused-text');
      const filteredTextEl = wrapper.find('.search-status-bar__filtered-text');
      assert.isFalse(focusedTextEl.exists());
      assert.isTrue(filteredTextEl.exists());
    });
  });

  context('selected-annotation(s) mode applied', () => {
    context('selected mode only', () => {
      [
        {
          description:
            'should display show-all-annotation button with annotation count',
          tab: 'annotation',
          annotationCount: 5,
          noteCount: 3,
          buttonText: 'Show all annotations (5)',
        },
        {
          description:
            'should display show-all-annotation button with annotation and notes count',
          tab: 'orphan',
          annotationCount: 5,
          noteCount: 3,
          buttonText: 'Show all annotations and notes',
        },
        {
          description: 'should display show-all-notes button with note count',
          tab: 'note',
          annotationCount: 3,
          noteCount: 3,
          buttonText: 'Show all notes (3)',
        },
        {
          description:
            'should display show-all-annotation button with no count',
          tab: 'annotation',
          annotationCount: 1,
          noteCount: 3,
          buttonText: 'Show all annotations',
        },
        {
          description: 'should display show-all-notes button with no count',
          tab: 'note',
          annotationCount: 1,
          noteCount: 1,
          buttonText: 'Show all notes',
        },
      ].forEach(test => {
        it(test.description, () => {
          fakeStore.getState.returns({
            selection: {
              filterQuery: null,
              selectedTab: test.tab,
            },
          });
          fakeStore.annotationCount.returns(test.annotationCount);
          fakeStore.noteCount.returns(test.noteCount);
          fakeStore.getSelectedAnnotationMap.returns({ annId: true });

          const wrapper = createComponent({});

          const button = wrapper.find('Button');

          assert.isTrue(button.exists());
          assert.equal(button.props().buttonText, test.buttonText);
        });
      });
    });

    context('combined with applied user-focused mode', () => {
      [
        { tab: 'annotation', buttonText: 'Show all annotations by Fake User' },
        { tab: 'orphan', buttonText: 'Show all annotations and notes' },
        { tab: 'note', buttonText: 'Show all notes by Fake User' },
      ].forEach(test => {
        it(`displays correct text for tab '${test.tab}', without count`, () => {
          fakeStore.focusModeFocused = sinon.stub().returns(true);
          fakeStore.getState.returns({
            selection: {
              filterQuery: null,
              selectedTab: test.tab,
            },
          });
          fakeStore.annotationCount.returns(5);
          fakeStore.getSelectedAnnotationMap.returns({ annId: true });
          fakeStore.noteCount.returns(3);

          const wrapper = createComponent({});

          const button = wrapper.find('Button');

          assert.isTrue(button.exists());
          assert.equal(button.props().buttonText, test.buttonText);
        });
      });
    });

    context('combined with applied query filter', () => {
      // Applied-query mode wins out here; no selection UI rendered
      it('does not show selected-mode elements', () => {
        fakeStore.focusModeFocused = sinon.stub().returns(true);
        fakeStore.getState.returns({
          selection: {
            filterQuery: 'tag:foo',
            selectedTab: 'annotation',
          },
        });
        fakeStore.annotationCount.returns(5);
        fakeStore.noteCount.returns(3);

        const wrapper = createComponent({});

        const button = wrapper.find('Button');

        assert.isTrue(button.exists());
        assert.equal(button.props().buttonText, 'Clear search');
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent({}),
    })
  );
});
