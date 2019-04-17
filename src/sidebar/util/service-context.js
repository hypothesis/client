'use strict';

/**
 * This module provides dependency injection of services into React
 * components via React's "context" API [1].
 *
 * It is initially being used to enable React components to depend on Angular
 * services/values without having to plumb the services through the tree of
 * components.
 *
 * [1] See https://reactjs.org/docs/context.html#api and
 *     https://reactjs.org/docs/hooks-reference.html#usecontext
 */

const { useContext } = require('preact/hooks');
const { createContext, createElement } = require('preact');

const fallbackInjector = {
  get(service) {
    throw new Error(
      `Missing ServiceContext provider to provide "${service}" prop`
    );
  },
};

/**
 * Context type for a service dependency injector.
 *
 * The value should be an object with a `get(serviceName)` method which returns
 * the instance of the named value or service.
 *
 * Consumers will either use this directly via `useContext` or use the
 * `withServices` wrapper.
 */
const ServiceContext = createContext(fallbackInjector);

/**
 * Wrap a React component to inject any services it depends upon as props.
 *
 * Components declare their service dependencies in an `injectedProps` static
 * property.
 *
 * Any props which are passed directly will override injected props.
 *
 * @example
 *   function MyComponent({ settings }) {
 *     return ...
 *   }
 *
 *   // Declare services that are injected from context rather than passed by
 *   // the parent.
 *   MyComponent.injectedProps = ['settings']
 *
 *   // Wrap `MyComponent` to inject any passed props.
 *   module.exports = withServices(MyComponent);
 */
function withServices(Component) {
  if (!Component.injectedProps) {
    // This component doesn't depend on any services, so there is no need
    // to wrap it.
    return Component;
  }

  function Wrapper(props) {
    const $injector = useContext(ServiceContext);
    const services = {};
    for (let service of Component.injectedProps) {
      if (!(service in props)) {
        services[service] = $injector.get(service);
      }
    }
    return <Component {...services} {...props} />;
  }
  const wrappedName = Component.displayName || Component.name;
  Wrapper.displayName = `withServices(${wrappedName})`;

  // Forward the prop types, except for those expected to be injected via
  // the `ServiceContext`.
  Wrapper.propTypes = { ...Component.propTypes };
  Component.injectedProps.forEach(prop => {
    delete Wrapper.propTypes[prop];
  });
  return Wrapper;
}

module.exports = {
  ServiceContext,
  withServices,
};
