'use strict';

/**
 * Returns true if the sidebar tutorial has to be shown to a user for a given session.
 */
function shouldShowSidebarTutorial(sessionState) {
  if (sessionState.preferences.show_sidebar_tutorial) {
    return true;
  }
  return false;
}

module.exports = {
  shouldShowSidebarTutorial: shouldShowSidebarTutorial,
};
