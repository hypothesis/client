'use strict';

const session = require('../session');

const util = require('../../util');

const { init, actions, selectors } = session;
const update = util.createReducer(session.update);

describe('sidebar.reducers.session', function () {
  describe('#updateSession', function () {
    it('updates the session state', function () {
      const newSession = Object.assign(init(), {userid: 'john'});
      const state = update(init(), actions.updateSession(newSession));
      assert.deepEqual(state.session, newSession);
    });
  });

  describe('#profile', () => {
    it("returns the user's profile", () => {
      const newSession = Object.assign(init(), {userid: 'john'});
      const state = update(init(), actions.updateSession(newSession));
      assert.equal(selectors.profile(state), newSession);
    });
  });
});
