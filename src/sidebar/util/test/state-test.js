import fakeStore from '../../test/fake-redux-store';
import * as stateUtil from '../state';

describe('sidebar/util/state', function () {
  let store;

  beforeEach(function () {
    store = fakeStore({
      fake: { val: 0 },
    });
  });

  describe('awaitStateChange()', function () {
    function getValWhenGreaterThanTwo(store) {
      if (store.getState().val < 3) {
        return null;
      }
      return store.getState().val;
    }

    it('should return promise that resolves to a non-null value', function () {
      const expected = 5;
      store.setState({ val: 5 });
      return stateUtil
        .awaitStateChange(store, getValWhenGreaterThanTwo)
        .then(function (actual) {
          assert.equal(actual, expected);
        });
    });

    it('should wait for awaitStateChange to return a non-null value', function () {
      let valPromise;
      const expected = 5;

      store.setState({ val: 2 });
      valPromise = stateUtil.awaitStateChange(store, getValWhenGreaterThanTwo);
      store.setState({ val: 5 });

      return valPromise.then(function (actual) {
        assert.equal(actual, expected);
      });
    });
  });
});
