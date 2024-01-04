import { createStore } from '../../create-store';
import { filtersModule } from '../filters';
import { selectionModule } from '../selection';

describe('sidebar/store/modules/filters', () => {
  let store;
  let fakeSettings = [{}, {}];

  const getFiltersState = () => {
    return store.getState().filters;
  };

  // Values for the `focus` settings key which turn on filters when the client
  // starts.
  const userFocusConfig = {
    user: { username: 'somebody', displayName: 'Ding Bat' },
  };
  const pageFocusConfig = { pages: '5-10' };
  const cfiFocusConfig = {
    cfi: {
      range: '/2-/4',
      label: 'Chapter 1',
    },
  };

  beforeEach(() => {
    store = createStore([filtersModule, selectionModule], fakeSettings);
  });

  describe('actions', () => {
    describe('changeFocusModeUser', () => {
      it('sets the focused user and activates focus', () => {
        store.toggleFocusMode({ active: false });
        store.changeFocusModeUser({
          username: 'testuser',
          displayName: 'Test User',
        });
        const filterState = getFiltersState();
        assert.deepEqual(filterState.focusActive, new Set(['user']));
        assert.equal(filterState.focusFilters.user.value, 'testuser');
        assert.equal(filterState.focusFilters.user.display, 'Test User');
      });

      // When the LMS app wants the client to disable focus mode it sends a
      // changeFocusModeUser() RPC call with {username: undefined, displayName:
      // undefined}:
      //
      // https://github.com/hypothesis/lms/blob/d6b88fd7e375a4b23899117556b3e39cfe18986b/lms/static/scripts/frontend_apps/components/LMSGrader.js#L46
      //
      // This is the LMS app's way of asking the client to disable focus mode.
      it('deactivates and disables focus if username is undefined', () => {
        // Set to a valid user first; this will set and also activate
        // the filter
        store.changeFocusModeUser({
          username: 'testuser',
          displayName: 'Test User',
        });

        const firstFilterState = getFiltersState();
        assert.deepEqual(firstFilterState.focusActive, new Set(['user']));
        assert.equal(firstFilterState.focusFilters.user.value, 'testuser');

        // Now, emulate the "empty" filter message from the LMS app.
        store.changeFocusModeUser({
          username: undefined,
          displayName: undefined,
        });

        const secondFilterState = getFiltersState();
        assert.deepEqual(secondFilterState.focusActive, new Set());
        assert.isUndefined(secondFilterState.focusFilters.user);
      });
    });

    describe('setFilter', () => {
      it('adds the filter to the filters', () => {
        store.setFilter('whatever', {
          value: 'anyOldThing',
          display: 'Any Old Thing',
        });

        const filters = store.getFilters();

        assert.equal(filters.whatever.value, 'anyOldThing');
        assert.equal(filters.whatever.display, 'Any Old Thing');
        assert.lengthOf(Object.keys(filters), 1);
      });

      it('removes the filter if the filter value is empty', () => {
        store.setFilter('whatever', {
          value: 'anyOldThing',
          display: 'Any Old Thing',
        });
        store.setFilter('whatever', { value: '', display: 'Any Old Thing' });

        const filters = store.getFilters();

        assert.lengthOf(Object.keys(filters), 0);
        assert.isUndefined(filters.whatever);
      });

      it('disables focus mode if there is a conflicting filter key', () => {
        store = createStore(
          [filtersModule],
          [{ focus: { user: { username: 'somebody' } } }],
        );

        assert.isTrue(store.focusState().active);

        // No conflict in focusFilters on `elephant`
        store.setFilter('elephant', {
          value: 'pink',
          display: 'Pink Elephant',
        });

        assert.isTrue(store.focusState().active);

        store.setFilter('user', { value: '', display: 'Everybody' });
        assert.isFalse(store.focusState().active);
      });

      it('replaces pre-existing filter with the same key', () => {
        store.setFilter('whatever', {
          value: 'anyOldThing',
          display: 'Any Old Thing',
        });
        store.setFilter('whatever', {
          value: 'thisOldThing',
          display: 'This Old Thing',
        });

        const filters = store.getFilters();

        assert.lengthOf(Object.keys(filters), 1);
        assert.equal(filters.whatever.value, 'thisOldThing');
        assert.equal(filters.whatever.display, 'This Old Thing');
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
      ['user', 'page', 'cfi'].forEach(filterKey => {
        it('toggles the current active state if `active` is undefined', () => {
          store.toggleFocusMode({ key: filterKey, active: false });
          store.toggleFocusMode({ key: filterKey, active: undefined });
          assert.deepEqual(store.getFocusActive(), new Set([filterKey]));
        });

        it('toggles the current active state to designated state', () => {
          store.toggleFocusMode({ key: filterKey, active: true });
          store.toggleFocusMode({ key: filterKey, active: false });
          assert.deepEqual(store.getFocusActive(), new Set());
        });
      });

      it('toggles all configured focus modes if filter key is not provided', () => {
        store = createStore(
          [filtersModule],
          [
            {
              focus: { ...pageFocusConfig, ...userFocusConfig },
            },
          ],
        );

        assert.deepEqual(store.getFocusActive(), new Set(['user', 'page']));
        store.toggleFocusMode();
        assert.deepEqual(store.getFocusActive(), new Set());
        store.toggleFocusMode();
        assert.deepEqual(store.getFocusActive(), new Set(['user', 'page']));
      });
    });

    describe('CLEAR_SELECTION', () => {
      it('responds to CLEAR_SELECTION by clearing filters and focus', () => {
        store.changeFocusModeUser({
          username: 'testuser',
          displayName: 'Test User',
        });
        store.toggleFocusMode({ active: true });

        assert.deepEqual(store.getFocusActive(), new Set(['user']));

        store.clearSelection();

        assert.deepEqual(store.getFocusActive(), new Set());
      });
    });
  });

  describe('selectors', () => {
    describe('focusState', () => {
      it('returns user focus information', () => {
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });

        const focusState = store.focusState();
        assert.isTrue(focusState.active);
        assert.isTrue(focusState.configured);
        assert.equal(focusState.displayName, 'Pantomime Nutball');
      });

      it('returns page focus info', () => {
        store = createStore([filtersModule], [{ focus: pageFocusConfig }]);
        const focusState = store.focusState();
        assert.isTrue(focusState.active);
        assert.isTrue(focusState.configured);
        assert.equal(focusState.pageRange, pageFocusConfig.pages);
      });

      it('returns CFI focus info', () => {
        store = createStore([filtersModule], [{ focus: cfiFocusConfig }]);
        const focusState = store.focusState();
        assert.isTrue(focusState.active);
        assert.isTrue(focusState.configured);
        assert.equal(focusState.contentRange, cfiFocusConfig.cfi.label);
      });

      it('returns empty focus values when no focus is configured or set', () => {
        const focusState = store.focusState();
        assert.isFalse(focusState.active);
        assert.isFalse(focusState.configured);
        assert.isEmpty(focusState.displayName);
      });
    });

    describe('getFilter', () => {
      it('returns the specified filter', () => {
        store.setFilter('five', { value: 'cinq', display: '5' });

        const fiveFilter = store.getFilter('five');

        assert.equal(fiveFilter.value, 'cinq');
        assert.equal(fiveFilter.display, '5');
      });

      it('returns undefined if no such filter', () => {
        assert.isUndefined(store.getFilter('nobodyLivesHere'));
      });
    });

    describe('getFilters', () => {
      it('returns all of the filters', () => {
        store.setFilter('bananagram', {
          value: 'bananagram007',
          display: 'Riviera Bananagram',
        });
        store.setFilter('beepingNoise', {
          value: 'reallyAnnoying',
          display: 'Definitely Most Annoying',
        });

        const filters = store.getFilters();

        assert.lengthOf(Object.keys(filters), 2);
        assert.exists(filters.bananagram);
        assert.exists(filters.beepingNoise);
        assert.equal(filters.beepingNoise.value, 'reallyAnnoying');
      });

      it('includes the `focusFilters` if `focusActive`', () => {
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });

        const filters = store.getFilters();

        assert.exists(filters.user);
        assert.equal(filters.user.value, 'filbert');
        assert.equal(filters.user.display, 'Pantomime Nutball');
      });

      it('gives preference to `filters` over `focusFilters`', () => {
        store.setFilter('user', {
          value: 'thisGuy',
          name: 'Brenda, For Some Reason',
        });
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });

        const filters = store.getFilters();

        assert.equal(filters.user.value, 'thisGuy');
      });
    });

    describe('getFilterValues', () => {
      it('returns the string values of all defined filters', () => {
        store.setFilter('goodNoise', {
          value: 'plop',
          display: 'Plopping Noises',
        });
        store.setFilter('avoidNoise', {
          value: 'beep',
          display: 'Beeping Noises',
        });

        const filterValues = store.getFilterValues();

        assert.lengthOf(Object.keys(filterValues), 2);
        assert.exists(filterValues.goodNoise);
        assert.exists(filterValues.avoidNoise);
        assert.equal(filterValues.goodNoise, 'plop');
      });

      it('includes the focusFilters if focusActive', () => {
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });

        const filterValues = store.getFilterValues();

        assert.equal(filterValues.user, 'filbert');
      });
    });

    describe('getFocusFilters', () => {
      [
        {
          focusConfig: userFocusConfig,
          filterKey: 'user',
          filterValue: {
            value: 'somebody',
            display: 'Ding Bat',
          },
        },
        {
          focusConfig: pageFocusConfig,
          filterKey: 'page',
          filterValue: {
            value: '5-10',
            display: '5-10',
          },
        },
        {
          focusConfig: cfiFocusConfig,
          filterKey: 'cfi',
          filterValue: {
            value: '/2-/4',
            display: 'Chapter 1',
          },
        },
      ].forEach(({ focusConfig, filterKey, filterValue }) => {
        it('returns any set focus filters', () => {
          store = createStore(
            [filtersModule],
            [
              {
                focus: focusConfig,
              },
            ],
          );
          const focusFilters = store.getFocusFilters();
          assert.exists(focusFilters[filterKey]);
          assert.deepEqual(focusFilters[filterKey], filterValue);
        });
      });
    });

    describe('hasAppliedFilter', () => {
      // Mapping of keys in `FocusConfig` configuration to the filters
      // supported by `filterAnnotations`.
      const configKeyToFilter = {
        cfi: 'cfi',
        pages: 'page',
        user: 'user',
      };

      it('returns true if there is a search query set', () => {
        store.setFilterQuery('foobar');

        assert.isTrue(store.hasAppliedFilter());
      });

      [userFocusConfig, pageFocusConfig, cfiFocusConfig].forEach(
        focusConfig => {
          it('returns true if focused mode is active', () => {
            store = createStore(
              [filtersModule],
              [{ focus: { ...focusConfig } }],
            );

            const filterKey = configKeyToFilter[Object.keys(focusConfig)[0]];

            assert.isTrue(store.hasAppliedFilter());
            store.toggleFocusMode({ key: filterKey, active: false });
            assert.isFalse(store.hasAppliedFilter());
          });
        },
      );

      it('returns true if there is an applied filter', () => {
        store.setFilter('anyWhichWay', { value: 'nope', display: 'Fatigue' });

        assert.isTrue(store.hasAppliedFilter());
      });

      it('returns true if there are both applied filters and focus filters', () => {
        store.changeFocusModeUser({
          username: 'filbert',
          displayName: 'Pantomime Nutball',
        });
        store.setFilter('anyWhichWay', { value: 'nope', display: 'Fatigue' });

        assert.isTrue(store.hasAppliedFilter());
      });
    });
  });
});
