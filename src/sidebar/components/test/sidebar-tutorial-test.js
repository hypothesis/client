'use strict';

var Controller = require('../sidebar-tutorial').controller;

describe('SidebarTutorialController', function () {

  describe('showSidebarTutorial', function () {
    var settings = {};

    it('returns true if show_sidebar_tutorial is true', function () {
      var session = {
        state: {
          preferences: {
            show_sidebar_tutorial: true,
          },
        },
      };
      var controller = new Controller(session, settings);

      var result = controller.showSidebarTutorial();

      assert.equal(result, true);
    });

    it('returns false if show_sidebar_tutorial is false', function () {
      var session = {
        state: {
          preferences: {
            show_sidebar_tutorial: false,
          },
        },
      };
      var controller = new Controller(session, settings);

      var result = controller.showSidebarTutorial();

      assert.equal(result, false);
    });

    it('returns false if show_sidebar_tutorial is missing', function () {
      var session = {state: {preferences: {}}};
      var controller = new Controller(session, settings);

      var result = controller.showSidebarTutorial();

      assert.equal(result, false);
    });
  });
});
