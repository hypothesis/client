import uiConstants from '../../../ui-constants';
import createStore from '../../create-store';
import annotations from '../annotations';
import filters from '../filters';
import selection from '../selection';
import route from '../route';
import * as fixtures from '../../../test/annotation-fixtures';

describe('sidebar/store/modules/selection', () => {
  let store;
  let fakeSettings = [{}, {}];

  const getSelectionState = () => {
    return store.getState().selection;
  };

  beforeEach(() => {
    store = createStore([annotations, filters, selection, route], fakeSettings);
  });

  describe('getFirstSelectedAnnotationId', function () {
    it('returns the first selected annotation id it finds', function () {
      store.selectAnnotations([1, 2]);
      assert.equal(store.getFirstSelectedAnnotationId(), 1);
    });

    it('returns null if no selected annotation ids are found', function () {
      store.selectAnnotations([]);
      assert.isNull(store.getFirstSelectedAnnotationId());
    });
  });

  describe('setForcedVisible', function () {
    it('sets the visibility of the annotation', function () {
      store.setForcedVisible('id1', true);
      assert.deepEqual(getSelectionState().forcedVisible, { id1: true });
    });

    it('does not affect the visibility of other annotations', () => {
      store.setForcedVisible('id1', true);
      store.setForcedVisible('id2', false);
      assert.deepEqual(getSelectionState().forcedVisible, {
        id1: true,
        id2: false,
      });
      assert.deepEqual(store.forcedVisibleAnnotations(), ['id1']);
    });
  });

  describe('setExpanded()', function () {
    it('sets the expanded state of the annotation', function () {
      store.setExpanded('parent_id', true);
      store.setExpanded('whatnot', false);
      assert.deepEqual(store.expandedMap(), {
        parent_id: true,
        whatnot: false,
      });
    });
  });

  describe('hasAppliedFilter', () => {
    it('returns true if there is a search query set', () => {
      store.setFilterQuery('foobar');

      assert.isTrue(store.hasAppliedFilter());
    });

    it('returns true if user-focused mode is active', () => {
      store = createStore(
        [filters, selection],
        [{ focus: { user: { username: 'somebody' } } }]
      );

      assert.isTrue(store.hasAppliedFilter());
    });

    it('returns false if user-focused mode is configured but inactive', () => {
      store = createStore(
        [filters, selection],
        [{ focus: { user: { username: 'somebody' } } }]
      );
      store.toggleFocusMode(false);

      assert.isFalse(store.hasAppliedFilter());
    });

    it('returns true if there are selected annotations', () => {
      store.selectAnnotations([1]);

      assert.isTrue(store.hasAppliedFilter());
    });

    it('returns false after selection is cleared', () => {
      store.setFilterQuery('foobar');
      store.clearSelection();

      assert.isFalse(store.hasAppliedFilter());
    });
  });

  describe('hasSelectedAnnotations', function () {
    it('returns true if there are any selected annotations', function () {
      store.selectAnnotations([1]);
      assert.isTrue(store.hasSelectedAnnotations());
    });

    it('returns false if there are no selected annotations', function () {
      assert.isFalse(store.hasSelectedAnnotations());
    });
  });

  describe('filterQuery', function () {
    it('returns the filterQuery value when provided', function () {
      store.setFilterQuery('tag:foo');
      assert.equal(store.filterQuery(), 'tag:foo');
    });

    it('returns null when no filterQuery is present', function () {
      assert.isNull(store.filterQuery());
    });
  });

  describe('threadState', () => {
    it('returns the current annotations in rootState', () => {
      const myAnnotation = fixtures.defaultAnnotation();
      store.addAnnotations([myAnnotation]);

      // `addAnnotations` injects some additional properties to annotations,
      // so we can't compare objects
      assert.equal(store.threadState().annotations[0].id, myAnnotation.id);
      assert.lengthOf(store.threadState().annotations, 1);
    });

    it('returns the current route name from rootState', () => {
      store.changeRoute('kamchatka');

      assert.equal(store.threadState().route, 'kamchatka');
    });

    it('returns relevant state about tab and sort', () => {
      store.selectTab('orphan');
      store.setSortKey('pyrrhic');

      const selection = store.threadState().selection;

      assert.equal(selection.selectedTab, 'orphan');
      assert.equal(selection.sortKey, 'pyrrhic');
    });

    it('returns the relevant state when annotations are selected', () => {
      store.selectAnnotations(['1', '2']);
      store.setExpanded('3', true);
      store.setExpanded('4', false);

      const selection = store.threadState().selection;

      assert.deepEqual(selection.expanded, { 3: true, 4: false });
      assert.deepEqual(selection.selected, ['1', '2']);
    });

    it('returns the relevant state when user-focus mode is applied', () => {
      store.changeFocusModeUser({
        username: 'testuser',
        displayName: 'Test User',
      });

      const selection = store.threadState().selection;

      assert.deepEqual(selection.filters, { user: 'testuser' });
    });

    it('returns the relevant state when a filter query is applied', () => {
      store.setFilterQuery('frappe');

      const selection = store.threadState().selection;

      assert.equal(selection.filterQuery, 'frappe');
    });
  });

  describe('selectAnnotations()', function () {
    it('adds the passed annotations to the selectedAnnotations', function () {
      store.selectAnnotations([1, 2, 3]);
      assert.deepEqual(getSelectionState().selected, {
        1: true,
        2: true,
        3: true,
      });
    });

    it('replaces any annotations originally in the selection', function () {
      store.selectAnnotations([1]);
      store.selectAnnotations([2, 3]);
      assert.deepEqual(getSelectionState().selected, {
        2: true,
        3: true,
      });
    });

    it('empties the selection object if no annotations are selected', function () {
      store.selectAnnotations([1]);
      store.selectAnnotations([]);
      assert.isObject(getSelectionState().selected);
      assert.isEmpty(getSelectionState().selected);
    });
  });

  describe('toggleSelectedAnnotations()', function () {
    it('adds annotations missing from the selectedAnnotations', function () {
      store.selectAnnotations([1, 2]);
      store.toggleSelectedAnnotations([3, 4]);
      assert.deepEqual(getSelectionState().selected, {
        1: true,
        2: true,
        3: true,
        4: true,
      });
    });

    it('removes annotations already in the selection', function () {
      store.selectAnnotations([1, 3]);
      store.toggleSelectedAnnotations([1, 2]);
      assert.deepEqual(getSelectionState().selected, {
        1: false,
        2: true,
        3: true,
      });
    });
  });

  describe('CHANGE_FOCUS_MODE_USER', () => {
    it('clears selection', () => {
      store.selectAnnotations([1, 2, 3]);
      store.setForcedVisible(2, true);

      store.changeFocusModeUser({
        username: 'testuser',
        displayName: 'Test User',
      });

      assert.isEmpty(store.selectedAnnotations());
      assert.isEmpty(store.forcedVisibleAnnotations());
    });
  });

  describe('SET_FILTER_QUERY', () => {
    it('clears selection', () => {
      store.selectAnnotations([1, 2, 3]);
      store.setForcedVisible(2, true);

      store.setFilterQuery('foobar');

      assert.isEmpty(store.selectedAnnotations());
      assert.isEmpty(store.forcedVisibleAnnotations());
    });
  });

  describe('SET_FOCUS_MODE', () => {
    it('clears selection', () => {
      store.selectAnnotations([1, 2, 3]);
      store.setForcedVisible(2, true);

      store.toggleFocusMode(true);

      assert.isEmpty(store.selectedAnnotations());
      assert.isEmpty(store.forcedVisibleAnnotations());
    });
  });

  describe('#REMOVE_ANNOTATIONS', function () {
    it('removing an annotation should also remove it from the selection', function () {
      store.selectAnnotations([1, 2, 3]);
      store.setForcedVisible(2, true);
      store.setForcedVisible(1, true);
      store.setExpanded(1, true);
      store.setExpanded(2, true);
      store.removeAnnotations([{ id: 2 }]);
      assert.deepEqual(getSelectionState().selected, {
        1: true,
        3: true,
      });
      assert.deepEqual(store.forcedVisibleAnnotations(), ['1']);
      assert.deepEqual(store.expandedMap(), { 1: true });
    });
  });

  describe('selectTab()', function () {
    it('sets the selected tab', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.equal(
        getSelectionState().selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('ignores junk tag names', function () {
      store.selectTab('flibbertigibbert');
      assert.equal(
        getSelectionState().selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('allows sorting annotations by time and document location', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(store.sortKeys(), ['Newest', 'Oldest', 'Location']);
    });

    it('allows sorting page notes by time', function () {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(store.sortKeys(), ['Newest', 'Oldest']);
    });

    it('allows sorting orphans by time and document location', function () {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(store.sortKeys(), ['Newest', 'Oldest', 'Location']);
    });

    it('sorts annotations by document location by default', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(getSelectionState().sortKey, 'Location');
    });

    it('sorts page notes from oldest to newest by default', function () {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(getSelectionState().sortKey, 'Oldest');
    });

    it('sorts orphans by document location by default', function () {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(getSelectionState().sortKey, 'Location');
    });

    it('does not reset the sort key unless necessary', function () {
      // Select the tab, setting sort key to 'Oldest', and then manually
      // override the sort key.
      store.selectTab(uiConstants.TAB_NOTES);
      store.setSortKey('Newest');

      store.selectTab(uiConstants.TAB_NOTES);

      assert.equal(getSelectionState().sortKey, 'Newest');
    });
  });

  describe('selectedTab', () => {
    it('should return the currently-selected tab', () => {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.equal(store.selectedTab(), uiConstants.TAB_NOTES);
    });
  });

  describe('sortKey', () => {
    it('should return the currently-active sort key', () => {
      store.setSortKey('Newest');

      assert.equal(store.sortKey(), 'Newest');
    });
  });

  describe('ADD_ANNOTATIONS', () => {
    it('should select the page notes tab if all top-level annotations are page notes', () => {
      store.dispatch({
        type: 'ADD_ANNOTATIONS',
        annotations: [fixtures.oldPageNote(), fixtures.oldPageNote()],
        currentAnnotationCount: 0,
      });

      assert.equal(getSelectionState().selectedTab, uiConstants.TAB_NOTES);
    });

    it('should select the page notes tab if page notes have replies', () => {
      const pageNote = fixtures.oldPageNote();
      const reply = fixtures.newReply();
      reply.references = [pageNote.id];
      store.dispatch({
        type: 'ADD_ANNOTATIONS',
        annotations: [pageNote, reply],
        currentAnnotationCount: 0,
      });

      assert.equal(getSelectionState().selectedTab, uiConstants.TAB_NOTES);
    });

    it('should not select the page notes tab if there were previously annotations in the store', () => {
      store.dispatch({
        type: 'ADD_ANNOTATIONS',
        annotations: [fixtures.oldPageNote(), fixtures.oldPageNote()],
        currentAnnotationCount: 4,
      });

      assert.equal(
        getSelectionState().selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('should not select the page notes tab if there are non-page-note annotations at the top level', () => {
      store.dispatch({
        type: 'ADD_ANNOTATIONS',
        annotations: [
          fixtures.oldPageNote(),
          fixtures.oldPageNote(),
          fixtures.oldHighlight(),
        ],
        currentAnnotationCount: 0,
      });

      assert.equal(
        getSelectionState().selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });
  });
});
