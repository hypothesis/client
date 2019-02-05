'use strict';

const sessionUtil = require('../session-util');

describe('sessionUtil.shouldShowSidebarTutorial', function() {
  it('shows sidebar tutorial if the settings object has the show_sidebar_tutorial key set', function() {
    const sessionState = {
      preferences: {
        show_sidebar_tutorial: true,
      },
    };

    assert.isTrue(sessionUtil.shouldShowSidebarTutorial(sessionState));
  });

  it('hides sidebar tutorial if the settings object does not have the show_sidebar_tutorial key set', function() {
    const sessionState = {
      preferences: {
        show_sidebar_tutorial: false,
      },
    };

    assert.isFalse(sessionUtil.shouldShowSidebarTutorial(sessionState));
  });
});
