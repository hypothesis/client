/* global angular */

/**
 * Converts a camelCase name into hyphenated ('camel-case') form.
 *
 * This matches how Angular maps directive names to HTML tag names.
 */
function hyphenate(name) {
  const uppercasePattern = /([A-Z])/g;
  return name.replace(uppercasePattern, '-$1').toLowerCase();
}

/**
 * A helper for instantiating an AngularJS directive in a unit test.
 *
 * Usage:
 *   var domElement = createDirective(document, 'myComponent', {
 *     attrA: 'initial-value'
 *   }, {
 *     scopeProperty: scopeValue
 *   },
 *   'Hello, world!');
 *
 * Will generate '<my-component attr-a="attrA">Hello, world!</my-component>' and
 * compile and link it with the scope:
 *
 *  { attrA: 'initial-value', scopeProperty: scopeValue }
 *
 * The initial value may be a callback function to invoke. eg:
 *
 * var domElement = createDirective(document, 'myComponent', {
 *  onEvent: function () {
 *    console.log('event triggered');
 *  }
 * });
 *
 * If the callback accepts named arguments, these need to be specified
 * via an object with 'args' and 'callback' properties:
 *
 * var domElement = createDirective(document, 'myComponent', {
 *   onEvent: {
 *     args: ['arg1'],
 *     callback: function (arg1) {
 *       console.log('callback called with arg', arg1);
 *     }
 *   }
 * });
 *
 * @param {Document} document - The DOM Document to create the element in
 * @param {string} name - The name of the directive to instantiate
 * @param {Object} [attrs] - A map of attribute names (in camelCase) to initial
 *                           values.
 * @param {Object} [initialScope] - A dictionary of properties to set on the
 *                                  scope when the element is linked
 * @param {string} [initialHtml] - Initial inner HTML content for the directive
 *                                 element.
 * @param {Object} [opts] - Object specifying options for creating the
 *                          directive:
 *                          'parentElement' - The parent element for the new
 *                                            directive. Defaults to document.body
 *
 * @return {DOMElement} The Angular jqLite-wrapped DOM element for the component.
 *                      The returned object has a link(scope) method which will
 *                      re-link the component with new properties.
 */
export function createDirective(
  document,
  name,
  attrs,
  initialScope,
  initialHtml,
  opts
) {
  attrs = attrs || {};
  initialScope = initialScope || {};
  initialHtml = initialHtml || '';
  opts = opts || {};
  opts.parentElement = opts.parentElement || document.body;

  // Create a template consisting of a single element, the directive
  // we want to create and compile it.
  let $compile;
  let $scope;
  angular.mock.inject(function(_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $scope = _$rootScope_.$new();
  });
  const templateElement = document.createElement(hyphenate(name));
  Object.keys(attrs).forEach(function(key) {
    const attrName = hyphenate(key);
    let attrKey = key;
    if (typeof attrs[key] === 'function') {
      // If the input property is a function, generate a function expression,
      // eg. `<my-component on-event="onEvent()">`
      attrKey += '()';
    } else if (attrs[key].callback) {
      // If the input property is a function which accepts arguments,
      // generate the argument list.
      // eg. `<my-component on-change="onChange(newValue)">`
      attrKey += '(' + attrs[key].args.join(',') + ')';
    }
    templateElement.setAttribute(attrName, attrKey);
  });
  templateElement.innerHTML = initialHtml;

  // Add the element to the document's body so that
  // it responds to events, becomes visible, reports correct
  // values for its dimensions etc.
  opts.parentElement.appendChild(templateElement);

  // setup initial scope
  Object.keys(attrs).forEach(function(key) {
    if (attrs[key].callback) {
      $scope[key] = attrs[key].callback;
    } else {
      $scope[key] = attrs[key];
    }
  });

  // compile the template
  const linkFn = $compile(templateElement);

  // link the component, passing in the initial
  // scope values. The caller can then re-render/link
  // the template passing in different properties
  // and verify the output
  const linkDirective = function(props) {
    const childScope = $scope.$new();
    angular.extend(childScope, props);
    const element = linkFn(childScope);
    element.scope = childScope;
    childScope.$digest();
    element.ctrl = element.controller(name);

    if (!element.ctrl) {
      throw new Error(
        'Failed to create "' +
          name +
          '" directive in test.' +
          'Did you forget to register it with angular.module(...).directive() ?'
      );
    }

    return element;
  };

  return linkDirective(initialScope);
}

/** Helper to dispatch a native event to a DOM element. */
export function sendEvent(element, eventType) {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}
