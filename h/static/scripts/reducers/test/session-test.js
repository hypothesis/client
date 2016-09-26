'use strict';

var session = require('../session');

var util = require('../util');

var init = session.init;
var actions = session.actions;
var update = util.createReducer(session.update);

describe('session reducer', function () {
  describe('#updateSession', function () {
    it('updates the session state', function () {
      var newSession = Object.assign(init(), {userid: 'john'});
      var state = update(init(), actions.updateSession(newSession));
      assert.deepEqual(state.session, newSession);
    });
  });
});
