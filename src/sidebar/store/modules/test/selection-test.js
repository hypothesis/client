import uiConstants from '../../../ui-constants';
import createStore from '../../create-store';
import annotations from '../annotations';
import selection from '../selection';
import * as fixtures from '../../../test/annotation-fixtures';

describe('sidebar/store/modules/selection', () => {
  let store;
  let fakeSettings = [{}, {}];

  const getSelectionState = () => {
    return store.getState().selection;
  };

  beforeEach(() => {
    store = createStore([annotations, selection], fakeSettings);
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

    it('returns true if user-focused mode applied', () => {
      store = createStore([selection], [{ focus: { user: {} } }]);
      store.toggleFocusMode(true);

      assert.isTrue(store.hasAppliedFilter());
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

  describe('#REMOVE_ANNOTATIONS', function () {
    it('removing an annotation should also remove it from the selection', function () {
      store.selectAnnotations([1, 2, 3]);
      store.removeAnnotations([{ id: 2 }]);
      assert.deepEqual(getSelectionState().selected, {
        1: true,
        3: true,
      });
    });
  });

  describe('clearSelectedAnnotations()', function () {
    it('removes all annotations from the selection', function () {
      store.selectAnnotations([1]);
      store.clearSelectedAnnotations();
      assert.isEmpty(getSelectionState().selected);
    });

    it('clears the current search query', function () {
      store.setFilterQuery('foo');
      store.clearSelectedAnnotations();
      assert.isNull(getSelectionState().filterQuery);
    });
  });

  describe('setFilterQuery()', function () {
    it('sets the filter query', function () {
      store.setFilterQuery('a-query');
      assert.equal(getSelectionState().filterQuery, 'a-query');
    });

    it('resets the force-visible and expanded sets', function () {
      store.setForcedVisible('123', true);
      store.setExpanded('456', true);
      store.setFilterQuery('some-query');
      assert.deepEqual(getSelectionState().forcedVisible, {});
      assert.deepEqual(getSelectionState().expanded, {});
    });
  });

  describe('changeFocusModeUser', function () {
    it('sets the focused user and enables focus mode', function () {
      store.toggleFocusMode(false);
      store.changeFocusModeUser({
        username: 'testuser',
        displayName: 'Test User',
      });
      assert.equal(store.focusModeUserFilter(), 'testuser');
      assert.equal(store.focusModeUserPrettyName(), 'Test User');
      assert.equal(store.focusModeActive(), true);
      assert.equal(store.focusModeConfigured(), true);
    });

    // When the LMS app wants the client to disable focus mode it sends a
    // changeFocusModeUser() RPC call with {username: undefined, displayName:
    // undefined}:
    //
    // https://github.com/hypothesis/lms/blob/d6b88fd7e375a4b23899117556b3e39cfe18986b/lms/static/scripts/frontend_apps/components/LMSGrader.js#L46
    //
    // This is the LMS app's way of asking the client to disable focus mode.
    it('disables focus mode if username is undefined', function () {
      store.toggleFocusMode(true);
      store.changeFocusModeUser({
        username: undefined,
        displayName: undefined,
      });
      assert.equal(store.focusModeActive(), false);
      assert.equal(store.focusModeConfigured(), false);
    });

    it('clears other applied selections', () => {
      store.toggleFocusMode(true);
      store.setForcedVisible('someAnnotationId');
      store.setFilterQuery('somequery');
      store.changeFocusModeUser({
        username: 'testuser',
        displayName: 'Test User',
      });

      assert.isEmpty(getSelectionState().forcedVisible);
      assert.isNull(store.filterQuery());
    });
  });

  describe('toggleFocusMode', function () {
    it('toggles the current active state if called without arguments', function () {
      store.toggleFocusMode(false);
      store.toggleFocusMode();
      assert.isTrue(store.focusModeActive());
    });

    it('toggles the current active state to designated state', function () {
      store.toggleFocusMode(true);
      store.toggleFocusMode(false);
      assert.isFalse(store.focusModeActive());
    });
  });

  describe('focusModeConfigured', function () {
    it('should be true when the focus setting is present and user valid', function () {
      store = createStore(
        [selection],
        [{ focus: { user: { username: 'anybody' } } }]
      );
      assert.isTrue(store.focusModeConfigured());
    });

    it('should be false when the focus setting is present but user object invalid', function () {
      store = createStore([selection], [{ focus: { user: {} } }]);
      assert.isFalse(store.focusModeConfigured());
    });

    it('should be false when the focus setting is not present', function () {
      assert.equal(store.focusModeConfigured(), false);
    });
  });

  describe('focusModeActive', function () {
    it('should return true by default when focus mode is active', function () {
      store = createStore(
        [selection],
        [{ focus: { user: { username: 'anybody' } } }]
      );
      assert.equal(getSelectionState().focusMode.configured, true);
      assert.equal(getSelectionState().focusMode.active, true);
      assert.equal(store.focusModeActive(), true);
    });

    it('should return false when focus config is not valid', () => {
      store = createStore(
        [selection],
        [{ focus: { user: { blerp: 'anybody' } } }]
      );
      assert.isFalse(store.focusModeActive());
    });

    it('should return false by default when focus mode is not active', function () {
      assert.equal(store.focusModeActive(), false);
    });
  });

  describe('focusModeUserPrettyName', function () {
    it('returns `displayName` when available', function () {
      store = createStore(
        [selection],
        [
          {
            focus: {
              user: { username: 'anybody', displayName: 'FakeDisplayName' },
            },
          },
        ]
      );
      assert.equal(store.focusModeUserPrettyName(), 'FakeDisplayName');
    });

    it('returns the `username` when `displayName` is missing', function () {
      store = createStore(
        [selection],
        [{ focus: { user: { username: 'anybody', userid: 'nobody' } } }]
      );
      assert.equal(store.focusModeUserPrettyName(), 'anybody');
    });

    it('returns the `userid` if `displayName` and `username` are missing', () => {
      store = createStore(
        [selection],
        [{ focus: { user: { userid: 'nobody' } } }]
      );
      assert.equal(store.focusModeUserPrettyName(), 'nobody');
    });

    it('returns empty string if focus mode is not configured', () => {
      store = createStore([selection], [{ focus: {} }]);
      assert.equal(store.focusModeUserPrettyName(), '');
    });
  });

  describe('focusModeUserFilter', function () {
    it('should return the user identifier when present', function () {
      store = createStore(
        [selection],
        [{ focus: { user: { userid: 'acct:userid@authority' } } }]
      );
      assert.equal(store.focusModeUserFilter(), 'acct:userid@authority');
    });
    it('should return null when no filter available', function () {
      store = createStore([selection], [{ focus: { user: {} } }]);
      assert.isNull(store.focusModeUserFilter());
    });
    it('should return null when the user object is not present', function () {
      assert.isNull(store.focusModeUserFilter());
    });
    it('should return the username when present but no userid', function () {
      // remove once LMS no longer sends username in RPC or config
      // https://github.com/hypothesis/client/issues/1516
      store = createStore(
        [selection],
        [{ focus: { user: { username: 'fake_user_name' } } }]
      );
      assert.equal(store.focusModeUserFilter(), 'fake_user_name');
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
