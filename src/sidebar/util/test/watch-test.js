import { createStore } from 'redux';

import { watch } from '../watch';

function counterReducer(state = { a: 0, b: 0, c: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT_A':
      return { ...state, a: state.a + 1 };
    case 'INCREMENT_B':
      return { ...state, b: state.b + 1 };
    case 'INCREMENT_C':
      return { ...state, c: state.c + 1 };
    default:
      return state;
  }
}

describe('sidebar/util/watch', () => {
  /**
   * Create a Redux store as a data source for testing the `watch` function.
   */
  function counterStore() {
    return createStore(counterReducer);
  }

  describe('watch', () => {
    it('runs callback when computed value changes', () => {
      const callback = sinon.stub();
      const store = counterStore();

      watch(store.subscribe, () => store.getState().a, callback);

      store.dispatch({ type: 'INCREMENT_A' });
      assert.calledWith(callback, 1, 0);

      store.dispatch({ type: 'INCREMENT_A' });
      assert.calledWith(callback, 2, 1);
    });

    it('does not run callback if computed value did not change', () => {
      const callback = sinon.stub();
      const store = counterStore();

      watch(store.subscribe, () => store.getState().a, callback);
      store.dispatch({ type: 'INCREMENT_B' });

      assert.notCalled(callback);
    });

    it('compares watched values using strict equality by default', () => {
      const callback = sinon.stub();
      const store = counterStore();
      const getValue = () => [store.getState().a];

      watch(store.subscribe, getValue, callback);

      store.dispatch({ type: 'INCREMENT_B' });
      store.dispatch({ type: 'INCREMENT_B' });

      // The callback is called twice even though `getValue` returns an array
      // with the same content each time, because a strict equality check is
      // used.
      assert.calledTwice(callback);
    });

    it('compares watched values using custom equality check', () => {
      const callback = sinon.stub();
      const store = counterStore();
      const equals = sinon.stub().returns(true);

      watch(store.subscribe, () => store.getState().a, callback, equals);

      store.dispatch({ type: 'INCREMENT_A' });
      store.dispatch({ type: 'INCREMENT_A' });

      assert.calledTwice(equals);
      assert.calledWith(equals, 1, 0);
      assert.calledWith(equals, 2, 0);
      assert.notCalled(callback);

      equals.returns(false);

      store.dispatch({ type: 'INCREMENT_A' });
      assert.calledWith(equals, 3, 0);
      assert.calledWith(callback, 3, 0);
    });

    it('returns unsubscription function', () => {
      const callback = sinon.stub();
      const store = counterStore();

      const unsubscribe = watch(
        store.subscribe,
        () => store.getState().a,
        callback
      );
      store.dispatch({ type: 'INCREMENT_A' });

      assert.calledWith(callback, 1, 0);

      callback.resetHistory();
      unsubscribe();
      store.dispatch({ type: 'INCREMENT_A' });

      assert.notCalled(callback);
    });
  });
});
