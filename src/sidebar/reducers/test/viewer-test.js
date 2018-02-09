'use strict';

var viewer = require('../viewer');

var util = require('../util');

var { init, actions, selectors } = viewer;
var update = util.createReducer(viewer.update);

describe('viewer reducer', function () {
  describe('#setAppIsSidebar', function () {
    it('sets a flag indicating that the app is the sidebar', function () {
      var state = update(init(), actions.setAppIsSidebar(true));
      assert.isTrue(selectors.isSidebar(state));
    });

    it('sets a flag indicating that the app is not the sidebar', function () {
      var state = update(init(), actions.setAppIsSidebar(false));
      assert.isFalse(selectors.isSidebar(state));
    });
  });
});
