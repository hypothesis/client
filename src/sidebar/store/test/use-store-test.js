import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';
import { createStore as createReduxStore } from 'redux';

import createStore from '../create-store';
import useStore, { useStoreProxy, $imports } from '../use-store';

// Plain Redux reducer used by `useStore` tests. Remove once `useStore` is removed.
const initialState = { value: 10, otherValue: 20 };
const reducer = (state = initialState, action) => {
  if (action.type === 'INCREMENT') {
    return { ...state, value: state.value + 1 };
  } else if (action.type === 'INCREMENT_OTHER') {
    return { ...state, otherValue: state.otherValue + 1 };
  } else {
    return state;
  }
};

// Store module for use with `createStore` in tests.
const thingsModule = {
  namespace: 'things',

  init: () => ({
    things: [],
  }),

  update: {
    ADD_THING(state, action) {
      if (state.things.some(t => t.id === action.thing.id)) {
        return {};
      }
      return { things: [...state.things, action.thing] };
    },
  },

  actions: {
    addThing(id) {
      return { type: 'ADD_THING', thing: { id } };
    },
  },

  selectors: {
    thingCount(state) {
      return state.things.length;
    },

    getThing(state, id) {
      return state.things.find(t => t.id === id);
    },
  },
};

describe('sidebar/store/use-store', () => {
  afterEach(() => {
    $imports.$restore();
  });

  // Tests for deprecated `useStore` function.
  describe('useStore', () => {
    let renderCount;
    let testStore;
    let TestComponent;

    beforeEach(() => {
      renderCount = 0;

      // eslint-disable-next-line react/display-name
      TestComponent = () => {
        renderCount += 1;
        const aValue = useStore(store => store.getState().value);
        return <div>{aValue}</div>;
      };

      testStore = createReduxStore(reducer);
      $imports.$mock({
        '../util/service-context': {
          useService: name => (name === 'store' ? testStore : null),
        },
      });
    });

    it('returns result of `callback(store)`', () => {
      const wrapper = mount(<TestComponent />);
      assert.equal(wrapper.text(), '10');
    });

    it('re-renders when the store changes and result of `callback(store)` also changes', () => {
      // An update which changes result of `callback(store)` should cause a re-render.
      const wrapper = mount(<TestComponent />);
      act(() => {
        testStore.dispatch({ type: 'INCREMENT' });
      });
      wrapper.update();
      assert.equal(wrapper.text(), '11');

      // The new result from `callback(store)` should be remembered so that another
      // update which doesn't change the result doesn't cause a re-render.
      const prevRenderCount = renderCount;
      act(() => {
        testStore.dispatch({ type: 'INCREMENT_OTHER' });
      });
      wrapper.update();
      assert.equal(renderCount, prevRenderCount);
    });

    it('does not re-render if the result of `callback(store)` did not change', () => {
      mount(<TestComponent />);
      const originalRenderCount = renderCount;
      act(() => {
        testStore.dispatch({ type: 'INCREMENT_OTHER' });
      });
      assert.equal(renderCount, originalRenderCount);
    });

    it('warns if the callback always returns a different value', () => {
      const warnOnce = sinon.stub();
      $imports.$mock({
        '../../shared/warn-once': warnOnce,
      });
      const BuggyComponent = () => {
        // The result of the callback is an object with an `aValue` property
        // which is a new array every time. This causes unnecessary re-renders.
        useStore(() => ({ aValue: [] }));
        return null;
      };
      mount(<BuggyComponent />);
      assert.called(warnOnce);
      assert.match(warnOnce.firstCall.args[0], /changes every time/);
    });

    it('unsubscribes when the component is unmounted', () => {
      const unsubscribe = sinon.stub();
      testStore.subscribe = sinon.stub().returns(unsubscribe);

      const wrapper = mount(<TestComponent />);

      assert.calledOnce(testStore.subscribe);
      wrapper.unmount();
      assert.calledOnce(unsubscribe);
    });
  });

  describe('useStoreProxy', () => {
    let store;
    let renderCount;

    beforeEach(() => {
      renderCount = 0;
      store = createStore([thingsModule]);

      store.addThing('foo');
      store.addThing('bar');

      $imports.$mock({
        '../util/service-context': {
          useService: name => (name === 'store' ? store : null),
        },
      });
    });

    function renderTestComponent() {
      let proxy;

      const TestComponent = () => {
        ++renderCount;
        proxy = useStoreProxy();

        return <div>{proxy.thingCount()}</div>;
      };

      const wrapper = mount(<TestComponent />);
      return { proxy, wrapper };
    }

    it('returns a proxy for the store', () => {
      const addThingSpy = sinon.spy(store, 'addThing');

      const { proxy } = renderTestComponent();

      assert.ok(proxy);

      // Test proxied selector method.
      assert.deepEqual(proxy.getThing('foo'), { id: 'foo' });
      assert.deepEqual(proxy.getThing('bar'), { id: 'bar' });

      // Test proxied action dispatch.
      proxy.addThing('baz');
      assert.calledWith(addThingSpy, 'baz');
    });

    it('proxies non-function properties of the store', () => {
      store.someString = 'foobar';

      const { proxy } = renderTestComponent();

      assert.equal(proxy.someString, 'foobar');
    });

    it('records and caches selector method calls', () => {
      const getThingSpy = sinon.spy(store, 'getThing');

      const { proxy } = renderTestComponent();

      proxy.getThing('foo');
      proxy.getThing('foo');

      assert.calledWith(getThingSpy, 'foo');
      assert.calledOnce(getThingSpy);
      getThingSpy.resetHistory();

      proxy.getThing('bar');
      proxy.getThing('bar');

      assert.calledWith(getThingSpy, 'bar');
      assert.calledOnce(getThingSpy);
    });

    it('does not cache action dispatches', () => {
      const addThingSpy = sinon.spy(store, 'addThing');

      const { proxy } = renderTestComponent();

      proxy.addThing('foo');
      proxy.addThing('foo');

      assert.calledTwice(addThingSpy);
      assert.calledWith(addThingSpy, 'foo');
    });

    context('after a store update', () => {
      it('clears cache and re-renders component if cache is invalid', () => {
        const { wrapper } = renderTestComponent();
        assert.equal(wrapper.text(), '2');
        assert.equal(renderCount, 1);

        // Dispatch an action which changes the store state used by the component.
        act(() => {
          store.addThing('baz');
        });
        wrapper.update();

        assert.equal(renderCount, 2);
        assert.equal(wrapper.text(), '3');
      });

      it('does not clear cache or re-render component if cache is still valid', () => {
        const { wrapper } = renderTestComponent();
        assert.equal(wrapper.text(), '2');
        assert.equal(renderCount, 1);

        // Dispatch an action which does not affect the store state used by the
        // component.
        act(() => {
          store.addThing('foo'); // nb. `foo` item already exists in store.
        });
        wrapper.update();

        assert.equal(renderCount, 1); // No re-render should happen.
        assert.equal(wrapper.text(), '2');
      });
    });

    it('unsubscribes from store when component is unmounted', () => {
      const { wrapper } = renderTestComponent();
      wrapper.unmount();

      // Trigger a store change after unmounting. It should not re-render the
      // component.
      act(() => {
        store.addThing('baz');
      });
      wrapper.update();

      assert.equal(renderCount, 1);
    });
  });
});
