'use strict';

var session = require('../session');

var util = require('../util');

var { init, actions, selectors } = session;
var update = util.createReducer(session.update);

describe('sidebar.reducers.session', function () {
  describe('#updateSession', function () {
    it('updates the session state', function () {
      var newSession = Object.assign(init(), {userid: 'john'});
      var state = update(init(), actions.updateSession(newSession));
      assert.deepEqual(state.session, newSession);
    });
  });

  describe('#profile', () => {
    it("returns the user's profile", () => {
      var newSession = Object.assign(init(), {userid: 'john'});
      var state = update(init(), actions.updateSession(newSession));
      assert.equal(selectors.profile(state), newSession);
    });
  });
});
