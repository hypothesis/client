'use strict';

var viewer = require('../viewer');

var util = require('../util');

var init = viewer.init;
var actions = viewer.actions;
var update = util.createReducer(viewer.update);

describe('viewer reducer', function () {
  describe('#setAppIsSidebar', function () {
    it('sets a flag indicating that the app is the sidebar', function () {
      var state = update(init(), actions.setAppIsSidebar(true));
      assert.isTrue(viewer.isSidebar(state));
    });

    it('sets a flag indicating that the app is not the sidebar', function () {
      var state = update(init(), actions.setAppIsSidebar(false));
      assert.isFalse(viewer.isSidebar(state));
    });
  });
});
