/**
 * @ngdoc service
 * @name  groups
 *
 * @description Provides access to the list of groups that the user is currently
 *              a member of and the currently selected group in the UI.
 *
 *              The list of groups is initialized from the session state
 *              and can then later be updated using the add() and remove()
 *              methods.
 */
'use strict';

var STORAGE_KEY = 'hypothesis.groups.focus';

var events = require('./events');

// @ngInject
function groups(localStorage, serviceUrl, session, $rootScope, store, settings) {
  // The currently focused group. This is the group that's shown as selected in
  // the groups dropdown, the annotations displayed are filtered to only ones
  // that belong to this group, and any new annotations that the user creates
  // will be created in this group.
  var focusedGroup;

  function all() {
    return session.state.groups || [];
  }

  // Return the full object for the group with the given id.
  function get(id) {
    var gs = all();
    for (var i = 0, max = gs.length; i < max; i++) {
      if (gs[i].id === id) {
        return gs[i];
      }
    }
    return null;
  }

  /**
   * Leave the group with the given ID.
   * Returns a promise which resolves when the action completes.
   */
  function leave(id) {
    // The groups list will be updated in response to a session state
    // change notification from the server. We could improve the UX here
    // by optimistically updating the session state
    return store.group.member.delete({
      pubid: id,
      user: 'me',
    });
  }


  /** Return the currently focused group. If no group is explicitly focused we
   * will check localStorage to see if we have persisted a focused group from
   * a previous session. Lastly, we fall back to the first group available.
   */
  function focused() {
    if (focusedGroup) {
      return focusedGroup;
    }
    var fromStorage = get(localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      focusedGroup = fromStorage;
      return focusedGroup;
    }
    return all()[0];
  }

  /** Set the group with the passed id as the currently focused group. */
  function focus(id) {
    var prevFocused = focused();
    var g = get(id);
    if (g) {
      focusedGroup = g;
      localStorage.setItem(STORAGE_KEY, g.id);
      if (prevFocused.id !== g.id) {
        $rootScope.$broadcast(events.GROUP_FOCUSED, g.id);
      }
    }
  }

  /**
   * Get an array of group objects representing groups that this page has explicitly opted into showing
   */
  function pageGroups() {
    return Promise.all((settings.pageGroups || []).map(function (groupUrl) {
      return store.group.read(groupUrl).catch((error) => {
        console.error('error fetching pageGroup for url', groupUrl, error);
      });
    }))
    .then(groups => groups.filter(Boolean));
  }

  /**
   * Wrap an async function such that it is only called once and the result is cached and promised on subsequent calls.
   * @param {Function<any, Promise<any>} fetch - Go fetch some value
   * @param {Function<any, any>} withResult - Function call with the reuslt the first time it's fetched. `this` will be same as `this` in cached() call
   */
  function cached(fetch, withResult) {
    var result = false;
    var fetching = false;
    return function (...args) {
      if ( ! result && ! fetching) {
        fetching = true;
        result = Promise.resolve(fetch(...args)).then(fetched => {
          result = fetched;
          return Promise.resolve(withResult.call(this, result)).then(() => result);
        });
      }
      return result;
    };
  }

  // reset the focused group if the user leaves it
  $rootScope.$on(events.GROUPS_CHANGED, function () {
    if (focusedGroup) {
      focusedGroup = get(focusedGroup.id);
      if (!focusedGroup) {
        $rootScope.$broadcast(events.GROUP_FOCUSED, focused());
      }
    }
  });

  var service = {
    all: all,
    get: get,
    pageGroups: cached(pageGroups, function (fetchedPageGroups) {
      // `this` is `service`
      return $rootScope.$apply(() => {
        this.pageGroups = () => fetchedPageGroups;
      });
    }),
    leave: leave,

    focused: focused,
    focus: focus,
  };

  return service;
}

module.exports = groups;
