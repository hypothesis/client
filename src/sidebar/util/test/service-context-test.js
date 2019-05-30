'use strict';

const { mount } = require('enzyme');
const propTypes = require('prop-types');
const { createElement, render } = require('preact');

const {
  ServiceContext,
  withServices,
  useService,
} = require('../service-context');

describe('service-context', () => {
  describe('withServices', () => {
    let container;
    let lastProps;

    function TestComponent(props) {
      lastProps = props;
    }
    TestComponent.injectedProps = ['aService'];
    const WrappedComponent = withServices(TestComponent);

    beforeEach(() => {
      lastProps = null;
      container = document.createElement('div');
    });

    it('returns the input component if there are no service dependencies', () => {
      function TestComponent() {}
      assert.equal(withServices(TestComponent), TestComponent);
    });

    it('looks up services that a Component depends on and injects them as props', () => {
      const testService = {};
      const injector = {
        get: sinon.stub().returns(testService),
      };
      render(
        <ServiceContext.Provider value={injector}>
          <WrappedComponent />
        </ServiceContext.Provider>,
        container
      );
      assert.deepEqual(lastProps, { aService: testService });
      assert.calledWith(injector.get, 'aService');
    });

    it('copies propTypes except for injected properties to wrapper', () => {
      function TestComponent() {}
      TestComponent.propTypes = {
        notInjected: propTypes.string,
        injected: propTypes.string,
      };
      TestComponent.injectedProps = ['injected'];

      const Wrapped = withServices(TestComponent);

      assert.deepEqual(Wrapped.propTypes, { notInjected: propTypes.string });
      assert.isUndefined(Wrapped.injectedProps);
    });

    it('does not look up services if they are passed as props', () => {
      const testService = {};
      const injector = {
        get: sinon.stub(),
      };
      render(
        <ServiceContext.Provider value={injector}>
          <WrappedComponent aService={testService} />
        </ServiceContext.Provider>,
        container
      );
      assert.notCalled(injector.get);
    });

    it('throws if injector is not available', () => {
      assert.throws(() => {
        render(<WrappedComponent />, container);
      }, /Missing ServiceContext/);
    });
  });

  describe('useService', () => {
    it('returns the named service', () => {
      const injector = {
        get: sinon
          .stub()
          .withArgs('aService')
          .returns('aValue'),
      };
      function TestComponent() {
        const value = useService('aService');
        return <div>{value}</div>;
      }
      const wrapper = mount(
        <ServiceContext.Provider value={injector}>
          <TestComponent />
        </ServiceContext.Provider>
      );
      assert.equal(wrapper.text(), 'aValue');
    });
  });
});
