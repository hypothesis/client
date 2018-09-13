'use strict';

const Controller = require('../sidebar-tutorial').controller;

describe('SidebarTutorialController', function () {

  describe('showSidebarTutorial', function () {
    const settings = {};

    it('returns true if show_sidebar_tutorial is true', function () {
      const session = {
        state: {
          preferences: {
            show_sidebar_tutorial: true,
          },
        },
      };
      const controller = new Controller(session, settings);

      const result = controller.showSidebarTutorial();

      assert.equal(result, true);
    });

    it('returns false if show_sidebar_tutorial is false', function () {
      const session = {
        state: {
          preferences: {
            show_sidebar_tutorial: false,
          },
        },
      };
      const controller = new Controller(session, settings);

      const result = controller.showSidebarTutorial();

      assert.equal(result, false);
    });

    it('returns false if show_sidebar_tutorial is missing', function () {
      const session = {state: {preferences: {}}};
      const controller = new Controller(session, settings);

      const result = controller.showSidebarTutorial();

      assert.equal(result, false);
    });
  });
});
