'use strict';

const createStore = require('../create-store');

const BASE = 0;

const modules = [
  {
    // base module
    init(value = 0) {
      return { count: value };
    },

    update: {
      INCREMENT_COUNTER: (state, action) => {
        return { count: state.count + action.amount };
      },
    },

    actions: {
      increment(amount) {
        return { type: 'INCREMENT_COUNTER', amount };
      },
    },

    selectors: {
      getCount(state) {
        return state.count;
      },
    },
  },
  {
    // namespaced module
    init(value = 0) {
      return { count: value };
    },
    namespace: 'foo',

    update: {
      ['INCREMENT_COUNTER_2'](state, action) {
        return { count: state.count + action.amount };
      },
    },

    actions: {
      increment2(amount) {
        return { type: 'INCREMENT_COUNTER_2', amount };
      },
    },

    selectors: {
      getCount2(state) {
        return state.foo.count;
      },
    },
  },
];

function counterStore(initArgs = [], middleware = []) {
  return createStore(modules, initArgs, middleware);
}

describe('sidebar.store.create-store', () => {
  it('returns a working Redux store', () => {
    const store = counterStore();
    store.dispatch(modules[BASE].actions.increment(5));
    assert.equal(store.getState().count, 5);
  });

  it('notifies subscribers when state changes', () => {
    const store = counterStore();
    const subscriber = sinon.spy(() => assert.equal(store.getCount(), 1));

    store.subscribe(subscriber);
    store.increment(1);

    assert.calledWith(subscriber);
  });

  it('passes initial state args to `init` function', () => {
    const store = counterStore([21]);
    assert.equal(store.getState().count, 21);
  });

  it('adds actions as methods to the store', () => {
    const store = counterStore();
    store.increment(5);
    assert.equal(store.getState().count, 5);
  });

  it('adds selectors as methods to the store', () => {
    const store = counterStore();
    store.dispatch(modules[BASE].actions.increment(5));
    assert.equal(store.getCount(), 5);
  });

  it('applies `thunk` middleware by default', () => {
    const store = counterStore();
    const doubleAction = (dispatch, getState) => {
      dispatch(modules[BASE].actions.increment(getState().base.count));
    };

    store.increment(5);
    store.dispatch(doubleAction);

    assert.equal(store.getCount(), 10);
  });

  it('applies additional middleware', () => {
    const actions = [];
    const middleware = () => {
      return next => {
        return action => {
          actions.push(action);
          return next(action);
        };
      };
    };
    const store = counterStore([], [middleware]);

    store.increment(5);

    assert.deepEqual(actions, [{ type: 'INCREMENT_COUNTER', amount: 5 }]);
  });

  it('namespaced actions and selectors operate on their respective state', () => {
    const store = counterStore();
    store.increment2(6);
    store.increment(5);
    assert.equal(store.getCount2(), 6);
  });

  it('getState returns the base state', () => {
    const store = counterStore();
    store.increment(5);
    assert.equal(store.getState().count, 5);
  });

  it('getRootState returns the top level root state', () => {
    const store = counterStore();
    store.increment(5);
    store.increment2(6);
    assert.equal(store.getRootState().base.count, 5);
    assert.equal(store.getRootState().foo.count, 6);
  });
});
