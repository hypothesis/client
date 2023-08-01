import { fakeReduxStore } from '../../test/fake-redux-store';
import { actionTypes, awaitStateChange } from '../util';

describe('sidebar/store/util', () => {
  describe('actionTypes', () => {
    it('returns an object with values equal to keys', () => {
      assert.deepEqual(
        actionTypes({
          SOME_ACTION: sinon.stub(),
          ANOTHER_ACTION: sinon.stub(),
        }),
        {
          SOME_ACTION: 'SOME_ACTION',
          ANOTHER_ACTION: 'ANOTHER_ACTION',
        },
      );
    });
  });

  describe('awaitStateChange', () => {
    let store;

    beforeEach(() => {
      store = fakeReduxStore({
        fake: { val: 0 },
      });
    });

    function getValWhenGreaterThanTwo(store) {
      if (store.getState().val < 3) {
        return null;
      }
      return store.getState().val;
    }

    it('should return promise that resolves to a non-null value', () => {
      const expected = 5;
      store.setState({ val: 5 });
      return awaitStateChange(store, getValWhenGreaterThanTwo).then(actual => {
        assert.equal(actual, expected);
      });
    });

    it('should wait for awaitStateChange to return a non-null value', () => {
      let valPromise;
      const expected = 5;

      store.setState({ val: 2 });
      valPromise = awaitStateChange(store, getValWhenGreaterThanTwo);
      store.setState({ val: 5 });

      return valPromise.then(actual => {
        assert.equal(actual, expected);
      });
    });
  });
});
