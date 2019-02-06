'use strict';

const viewer = require('../viewer');

const util = require('../../util');

const { init, actions, selectors } = viewer;
const update = util.createReducer(viewer.update);

describe('viewer reducer', function() {
  describe('#setAppIsSidebar', function() {
    it('sets a flag indicating that the app is the sidebar', function() {
      const state = update(init(), actions.setAppIsSidebar(true));
      assert.isTrue(selectors.isSidebar(state));
    });

    it('sets a flag indicating that the app is not the sidebar', function() {
      const state = update(init(), actions.setAppIsSidebar(false));
      assert.isFalse(selectors.isSidebar(state));
    });
  });
});
