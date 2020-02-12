import { createElement, render } from 'preact';

import { ServiceContext } from './service-context';

function useExpressionBinding(propName) {
  return propName.match(/^on[A-Z]/);
}

/**
 * @typedef {import('../../shared/injector').Injector} Injector
 */

/**
 * Controller for an Angular component that wraps a React component.
 *
 * This is responsible for taking the inputs to the Angular component and
 * rendering the React component in the DOM node where the Angular component
 * has been created.
 */
class ReactController {
  constructor($element, services, $scope, type) {
    /** The DOM element where the React component should be rendered. */
    this.domElement = $element[0];

    /**
     * The services injector, used by this component and its descendants.
     *
     * @type {Injector}
     */
    this.services = services;

    /** The React component function or class. */
    this.type = type;

    /** The input props to the React component. */
    this.props = {};

    // Wrap callback properties (eg. `onClick`) with `$scope.$apply` to trigger
    // a digest cycle after the function is called. This ensures that the
    // parent Angular component will update properly afterwards.
    Object.keys(this.type.propTypes).forEach(propName => {
      if (!useExpressionBinding(propName)) {
        return;
      }

      this.props[propName] = arg => {
        if (arg !== Object(arg)) {
          throw new Error(
            `${propName} callback must be invoked with an object. ` +
              `Was passed "${arg}"`
          );
        }

        // Test whether a digest cycle is already in progress using `$$phase`,
        // in which case there is no need to trigger one with `$apply`.
        //
        // Most of the time there will be no digest cycle in progress, but this
        // can happen if a change made by Angular code indirectly causes a
        // component to call a function prop.
        if ($scope.$root.$$phase) {
          this[propName](arg);
        } else {
          $scope.$apply(() => {
            this[propName](arg);
          });
        }
      };
    });
  }

  $onChanges(changes) {
    // Copy updated property values from parent Angular component to React
    // props. This callback is run when the component is initially created as
    // well as subsequent updates.
    Object.keys(changes).forEach(propName => {
      if (!useExpressionBinding(propName)) {
        this.props[propName] = changes[propName].currentValue;
      }
    });
    this.updateReactComponent();
  }

  $onDestroy() {
    // Unmount the rendered React component. Although Angular will remove the
    // element itself, this is necessary to run any cleanup/unmount lifecycle
    // hooks in the React component tree.
    render(createElement(null), this.domElement);
  }

  updateReactComponent() {
    // Render component, with a `ServiceContext.Provider` wrapper which
    // provides access to services via `withServices` or `useContext`
    // in child components.
    render(
      <ServiceContext.Provider value={this.services}>
        <this.type {...this.props} />
      </ServiceContext.Provider>,
      this.domElement
    );
  }
}

/**
 * Create an AngularJS component which wraps a React component.
 *
 * The React component must specify its expected inputs using the `propTypes`
 * property on the function or class (see
 * https://reactjs.org/docs/typechecking-with-proptypes.html). Props use
 * one-way ('<') bindings except for those with names matching /^on[A-Z]/ which
 * are assumed to be callbacks that use expression ('&') bindings.
 *
 * If the React component needs access to a service, it can get at
 * them using the `withServices` wrapper from service-context.js.
 *
 * @param {Function} type - The React component class or function
 * @param {Injector} services
 *   Dependency injection container providing services that components use.
 * @return {Object} -
 *   An AngularJS component spec for use with `angular.component(...)`
 */
export default function wrapReactComponent(type, services) {
  if (!type.propTypes) {
    throw new Error(
      `React component ${type.name} does not specify its inputs using "propTypes"`
    );
  }

  /**
   * Create an AngularJS component controller that renders the specific React
   * component being wrapped.
   */
  // @ngInject
  function createController($element, $scope) {
    return new ReactController($element, services, $scope, type);
  }

  const bindings = {};
  Object.keys(type.propTypes).forEach(propName => {
    bindings[propName] = useExpressionBinding(propName) ? '&' : '<';
  });

  return {
    bindings,
    controller: createController,
  };
}
