// import uiConstants from '../../../ui-constants';
import createStore from '../../create-store';
import filters from '../filters';
import selection from '../selection';
// import * as fixtures from '../../../test/annotation-fixtures';

describe('sidebar/store/modules/filters', () => {
  let store;
  let fakeSettings = [{}, {}];

  const getFiltersState = () => {
    return store.getState().filters;
  };

  beforeEach(() => {
    store = createStore([filters, selection], fakeSettings);
  });

  describe('actions', () => {
    describe('changeFocusModeUser', () => {
      it('sets the focused user and activates focus', () => {
        store.toggleFocusMode(false);
        store.changeFocusModeUser({
          username: 'testuser',
          displayName: 'Test User',
        });
        const focusState = getFiltersState().focus;
        assert.isTrue(focusState.active);
        assert.isTrue(focusState.configured);
        assert.equal(focusState.user.filter, 'testuser');
        assert.equal(focusState.user.displayName, 'Test User');
      });

      // When the LMS app wants the client to disable focus mode it sends a
      // changeFocusModeUser() RPC call with {username: undefined, displayName:
      // undefined}:
      //
      // https://github.com/hypothesis/lms/blob/d6b88fd7e375a4b23899117556b3e39cfe18986b/lms/static/scripts/frontend_apps/components/LMSGrader.js#L46
      //
      // This is the LMS app's way of asking the client to disable focus mode.
      it('deactivates and disables focus if username is undefined', () => {
        store.toggleFocusMode(true);
        store.changeFocusModeUser({
          username: undefined,
          displayName: undefined,
        });
        const focusState = getFiltersState().focus;
        assert.isFalse(focusState.active);
        assert.isFalse(focusState.configured);
      });
    });

    describe('setFilterQuery', () => {
      it('sets the filter query', () => {
        store.setFilterQuery('a-query');
        assert.equal(getFiltersState().query, 'a-query');
        assert.equal(store.filterQuery(), 'a-query');
      });
    });

    describe('toggleFocusMode', () => {
      it('toggles the current active state if called without arguments', () => {
        store.toggleFocusMode(false);
        store.toggleFocusMode();
        const focusState = getFiltersState().focus;
        assert.isTrue(focusState.active);
      });

      it('toggles the current active state to designated state', () => {
        store.toggleFocusMode(true);
        store.toggleFocusMode(false);
        const focusState = getFiltersState().focus;
        assert.isFalse(focusState.active);
      });
    });

    describe('CLEAR_SELECTION', () => {
      it('responds to CLEAR_SELECTION by clearing filters and focus', () => {
        store.changeFocusModeUser({
          username: 'testuser',
          displayName: 'Test User',
        });
        store.toggleFocusMode(true);

        let focusState = getFiltersState().focus;
        assert.isTrue(focusState.active);

        store.clearSelection();

        focusState = getFiltersState().focus;
        assert.isFalse(focusState.active);
      });
    });
  });

  describe('selectors', () => {
    describe('filterState', () => {
      it('returns the current filter query', () => {
        store.setFilterQuery('doodah, doodah');
        assert.equal(store.filterState().filterQuery, 'doodah, doodah');
      });

      it('returns user focus information', () => {
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });

        const filterState = store.filterState();
        assert.isTrue(filterState.focusActive);
        assert.isTrue(filterState.focusConfigured);
        assert.equal(filterState.focusDisplayName, 'Pantomime Nutball');
      });

      it('returns a count of forced-visible annotations', () => {
        store.setForcedVisible('kaboodle', true);
        store.setForcedVisible('stampy', false);

        assert.equal(store.filterState().forcedVisibleCount, 1);
      });

      it('returns a count of selected annotations', () => {
        store.selectAnnotations(['tabulature', 'felonious']);
        assert.equal(store.filterState().selectedCount, 2);
      });

      it('returns empty filter states when no filters active', () => {
        const filterState = store.filterState();
        assert.isFalse(filterState.focusActive);
        assert.isFalse(filterState.focusConfigured);
        assert.isEmpty(filterState.focusDisplayName);
        assert.isNull(filterState.filterQuery);
        assert.equal(filterState.forcedVisibleCount, 0);
        assert.equal(filterState.selectedCount, 0);
      });
    });
  });
});
