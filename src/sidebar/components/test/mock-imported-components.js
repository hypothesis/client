'use strict';

/**
 * Return true if `value` "looks like" a React/Preact component.
 */
function isComponent(value) {
  return (
    typeof value === 'function' &&
    value.hasOwnProperty('propTypes') &&
    value.name.match(/^[A-Z]/)
  );
}

/**
 * Return the display name of a component, minus the names of any wrappers
 * (eg. `withServices(OriginalName)` becomes `OriginalName`).
 *
 * @param {Function} component - A Preact component
 * @return {string}
 */
function getDisplayName(component) {
  let displayName =
    component.displayName || component.name || 'UnknownComponent';

  const wrappedComponentMatch = displayName.match(/\([A-Z][A-Za-z0-9]+\)/);
  if (wrappedComponentMatch) {
    displayName = wrappedComponentMatch[0].slice(1, -1);
  }

  return displayName;
}

/**
 * Helper for use with `babel-plugin-mockable-imports` that mocks components
 * imported by a file.
 *
 * Mocked components will have the same display name as the original component,
 * minus any wrappers (eg. `Widget` and `withServices(Widget)` both become
 * `Widget`). They will render only their children, as if they were just a
 * `Fragment`.
 *
 * Components may be excluded (not mocked) by using the `exclude` parameter.
 *
 * @example
 *   beforeEach(() => {
 *     ComponentUnderTest.$imports.$mock(mockImportedComponents());
 *
 *     // Add additional mocks or overrides here.
 *   });
 *
 *   afterEach(() => {
 *     ComponentUnderTest.$imports.$restore();
 *   });
 *
 * @param {string[]} exclude - An Array of component displayNames that
 *                             should not be mocked.
 * @return {Function} - A function that can be passed to `$imports.$mock`.
 */
function mockImportedComponents(exclude = []) {
  return (source, symbol, value) => {
    if (!isComponent(value)) {
      return null;
    }

    const mock = props => props.children;
    mock.displayName = getDisplayName(value);
    if (exclude.includes(mock.displayName)) {
      return null;
    }

    return mock;
  };
}

module.exports = mockImportedComponents;
