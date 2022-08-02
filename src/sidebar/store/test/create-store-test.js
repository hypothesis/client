/* global process */

import { createStore, createStoreModule } from '../create-store';

function initialState(value = 0) {
  return { count: value };
}

// Store modules that have the same state but under difference namespaces.
const counterModules = [
  createStoreModule(initialState, {
    namespace: 'a',

    reducers: {
      INCREMENT_COUNTER_A: (state, action) => {
        return { count: state.count + action.amount };
      },
      RESET: () => {
        return { count: 0 };
      },
    },

    actionCreators: {
      incrementA(amount) {
        return { type: 'INCREMENT_COUNTER_A', amount };
      },
    },

    selectors: {
      getCountA(state) {
        return state.count;
      },
    },

    rootSelectors: {
      getCountAFromRoot(state) {
        return state.a.count;
      },
    },
  }),

  createStoreModule(initialState, {
    namespace: 'b',

    reducers: {
      INCREMENT_COUNTER_B: (state, action) => {
        return { count: state.count + action.amount };
      },
      RESET: () => {
        return { count: 0 };
      },
    },

    actionCreators: {
      incrementB(amount) {
        return { type: 'INCREMENT_COUNTER_B', amount };
      },
    },

    selectors: {
      getCountB(state) {
        return state.count;
      },
    },
  }),
];

// Store module with reducers that update only a subset of the state.
const groupsModule = createStoreModule(
  {
    currentGroup: null,
    groups: [],
  },
  {
    namespace: 'groups',

    reducers: {
      ADD_GROUP(state, action) {
        return { groups: [...state.groups, action.group] };
      },

      SELECT_GROUP(state, action) {
        return { currentGroup: action.id };
      },
    },

    actionCreators: {
      addGroup(group) {
        return { type: 'ADD_GROUP', group };
      },
      selectGroup(id) {
        return { type: 'SELECT_GROUP', id };
      },
    },

    selectors: {
      allGroups(state) {
        return state.groups;
      },

      currentGroup(state) {
        return state.groups.find(g => g.id === state.currentGroup);
      },
    },
  }
);

function counterStore(initArgs = [], middleware = []) {
  return createStore(counterModules, initArgs, middleware);
}

describe('createStore', () => {
  it('returns a working Redux store', () => {
    const store = counterStore();
    assert.equal(store.getState().a.count, 0);
  });

  it('dispatches bound actions', () => {
    const store = counterStore();
    store.incrementA(5);
    assert.equal(store.getState().a.count, 5);
  });

  it('notifies subscribers when state changes', () => {
    const store = counterStore();
    const subscriber = sinon.spy(() => assert.equal(store.getCountA(), 1));

    store.subscribe(subscriber);
    store.incrementA(1);

    assert.calledWith(subscriber);
  });

  it('passes initial state args to `initialState` function', () => {
    const store = counterStore([21]);
    assert.equal(store.getState().a.count, 21);
  });

  it('adds actions as methods to the store', () => {
    const store = counterStore();
    store.incrementA(5);
    assert.equal(store.getState().a.count, 5);
  });

  it('adds selectors as methods to the store', () => {
    const store = counterStore();
    store.dispatch(counterModules[0].actionCreators.incrementA(5));
    assert.equal(store.getCountA(), 5);
  });

  it('adds root selectors as methods to the store', () => {
    const store = counterStore();
    store.dispatch(counterModules[0].actionCreators.incrementA(5));
    assert.equal(store.getCountAFromRoot(), 5);
  });

  it('applies `thunk` middleware by default', () => {
    const store = counterStore();
    const doubleAction = (dispatch, getState) => {
      dispatch(counterModules[0].actionCreators.incrementA(getState().a.count));
    };

    store.incrementA(5);
    store.dispatch(doubleAction);

    assert.equal(store.getCountA(), 10);
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

    store.incrementA(5);

    assert.deepEqual(actions, [{ type: 'INCREMENT_COUNTER_A', amount: 5 }]);
  });

  it('actions and selectors operate on their respective namespaced state', () => {
    const store = counterStore();
    store.incrementB(6);
    store.incrementA(5);
    assert.equal(store.getCountB(), 6);
    assert.equal(store.getCountA(), 5);
  });

  it('getState returns the top level root state', () => {
    const store = counterStore();
    store.incrementA(5);
    store.incrementB(6);
    assert.equal(store.getState().a.count, 5);
    assert.equal(store.getState().b.count, 6);
  });

  it('action can be handled across multiple reducers', () => {
    const store = counterStore();
    store.incrementA(1);
    store.incrementB(1);
    store.dispatch({
      type: 'RESET',
    });
    assert.equal(store.getState().a.count, 0);
    assert.equal(store.getState().b.count, 0);
  });

  it('supports modules with static initial state', () => {
    const initialState = { value: 42 };
    const module = createStoreModule(initialState, {
      namespace: 'test',
      actionCreators: {},
      reducers: {},
      selectors: {},
    });
    const store = createStore([module]);
    assert.equal(store.getState().test.value, 42);
  });

  it('combines state updates from reducers with initial module state', () => {
    const store = createStore([groupsModule]);

    const group1 = { id: 'g1', name: 'Test group 1' };
    const group2 = { id: 'g2', name: 'Test group 2' };

    // Trigger reducers which update different module state. For this to work
    // the result of each reducer must be combined with existing state.
    store.addGroup(group1);
    store.addGroup(group2);

    store.selectGroup('g1');
    assert.deepEqual(store.currentGroup(), group1);

    store.selectGroup('g2');
    assert.deepEqual(store.currentGroup(), group2);
  });

  it('throws if two store modules define the same selector', () => {
    const moduleA = createStoreModule(
      {},
      {
        namespace: 'a',
        reducers: {},
        actionCreators: {},
        selectors: { testSelector() {} },
      }
    );
    const moduleB = createStoreModule(
      {},
      {
        namespace: 'b',
        reducers: {},
        actionCreators: {},
        selectors: { testSelector() {} },
      }
    );
    assert.throws(
      () => createStore([moduleA, moduleB]),
      "Cannot add duplicate 'testSelector' property to object"
    );
  });

  it('throws if two store modules define the same action', () => {
    const moduleA = createStoreModule(
      {},
      {
        namespace: 'a',
        reducers: {},
        actionCreators: { testAction() {} },
        selectors: {},
      }
    );
    const moduleB = createStoreModule(
      {},
      {
        namespace: 'b',
        reducers: {},
        actionCreators: { testAction() {} },
        selectors: {},
      }
    );
    assert.throws(
      () => createStore([moduleA, moduleB]),
      "Cannot add duplicate 'testAction' property to object"
    );
  });

  if (process.env.NODE_ENV !== 'production') {
    it('freezes store state in development builds', () => {
      const store = counterStore();
      assert.throws(() => {
        store.getState().a.count = 1;
      }, /Cannot assign to read only property/);
    });
  }
});
