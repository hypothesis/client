'use strict';

var fakeStore = require('../../test/fake-redux-store');
var stateUtil = require('../state-util');

describe('state-util', function () {
  var store;

  beforeEach(function() {
    store = fakeStore({ val: 0 });
  });

  describe('awaitStateChange()', function () {
    function getValWhenGreaterThanTwo(store) {
      if (store.getState().val < 3) {
        return null;
      }
      return store.getState().val;
    }

    it('should return promise that resolves to a non-null value', function () {
      var expected = 5;

      store.setState({ val: 5 });

      return stateUtil.awaitStateChange(store, getValWhenGreaterThanTwo).then(function (actual) {
        assert.equal(actual, expected);
      });
    });

    it('should wait for awaitStateChange to return a non-null value', function () {
      var valPromise;
      var expected = 5;

      store.setState({ val: 2 });
      valPromise = stateUtil.awaitStateChange(store, getValWhenGreaterThanTwo);
      store.setState({ val: 5 });

      return valPromise.then(function (actual) {
        assert.equal(actual, expected);
      });
    });
  });
});
