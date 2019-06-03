'use strict';

const { mount } = require('enzyme');
const { createStore } = require('redux');
const { createElement } = require('preact');
const { act } = require('preact/test-utils');

const useStore = require('../use-store');
const { $imports } = useStore;

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

    testStore = createStore(reducer);
    $imports.$mock({
      '../util/service-context': {
        useService: name => (name === 'store' ? testStore : null),
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
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
