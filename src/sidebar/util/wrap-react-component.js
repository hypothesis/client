'use strict';

const { createElement, render } = require('preact');

function useExpressionBinding(propName) {
  return propName.match(/^on[A-Z]/);
}

/**
 * Base controller class for React component wrappers.
 *
 * This is responsible for rendering the React component into the DOM element
 * created by the Angular wrapper component.
 */
class ReactController {
  constructor($element, $scope, injectedProps, type) {
    /** The DOM element where the React component should be rendered. */
    this.element = $element[0];

    /** The React component function or class. */
    this.type = type;

    /** The input props to the React component. */
    this.props = injectedProps;

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
        $scope.$apply(() => {
          this[propName](arg);
        });
      };
    });
  }

  $onInit() {
    // Copy properties supplied by the parent Angular component to React props.
    Object.keys(this.type.propTypes).forEach(propName => {
      if (propName in this.props) {
        // Skip properties already handled in the constructor.
        return;
      }
      this.props[propName] = this[propName];
    });
    this.render();
  }

  $onChanges(changes) {
    // Copy updated property values from parent Angular component to React
    // props.
    Object.keys(changes).forEach(propName => {
      if (!useExpressionBinding(propName)) {
        this.props[propName] = changes[propName].currentValue;
      }
    });
    this.render();
  }

  $onDestroy() {
    // Unmount the rendered React component. Although Angular will remove the
    // element itself, this is necessary to run any cleanup/unmount lifecycle
    // hooks in the React component tree.
    render(createElement(null), this.element);
  }

  render() {
    // Create or update the React component.
    render(createElement(this.type, this.props), this.element);
  }
}

function objectWithKeysAndValues(keys, values) {
  const obj = {};
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = values[i];
  }
  return obj;
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
 * If the React component needs access to an Angular service, the service
 * should be added to `propTypes` and the name listed in an `injectedProps`
 * array:
 *
 * @example
 *   // In `MyComponent.js`:
 *   function MyComponent({ theme }) {
 *     return <div>You are using the {theme} theme</div>
 *   }
 *   MyComponent.propTypes = {
 *     theme: propTypes.string,
 *   }
 *   MyComponent.injectedProps = ['theme'];
 *
 *   // In the Angular bootstrap code:
 *   angular
 *     .module(...)
 *     .component('my-component', wrapReactComponent(MyComponent))
 *     .value('theme', 'dark');
 *
 * @param {Function} type - The React component class or function
 * @return {Object} -
 *   An AngularJS component spec for use with `angular.component(...)`
 */
function wrapReactComponent(type) {
  if (!type.propTypes) {
    throw new Error(
      `React component ${
        type.name
      } does not specify its inputs using "propTypes"`
    );
  }

  // Create controller.
  const injectedPropNames = type.injectedProps || [];
  class Controller extends ReactController {
    constructor($element, $scope, ...injectedPropValues) {
      const injectedProps = objectWithKeysAndValues(
        injectedPropNames,
        injectedPropValues
      );
      super($element, $scope, injectedProps, type);
    }
  }
  Controller.$inject = ['$element', '$scope', ...injectedPropNames];

  // Create bindings object.
  const bindings = {};
  Object.keys(type.propTypes)
    .filter(name => !injectedPropNames.includes(name))
    .forEach(propName => {
      bindings[propName] = useExpressionBinding(propName) ? '&' : '<';
    });

  return {
    bindings,
    controller: Controller,
  };
}

module.exports = wrapReactComponent;
