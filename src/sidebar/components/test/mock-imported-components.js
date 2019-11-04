'use strict';

function isComponent(value) {
  return (
    typeof value === 'function' &&
    value.hasOwnProperty('propTypes') &&
    value.name.match(/^[A-Z]/)
  );
}

/**
 * Return the display name of a component, stripping away any the names of
 * any wrapper components which use the `withWrapper(OriginalName)` convention.
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
 */
function mockImportedComponents() {
  return (source, symbol, value) => {
    if (!isComponent(value)) {
      return null;
    }

    const mock = props => props.children;
    mock.displayName = getDisplayName(value);

    return mock;
  };
}

module.exports = mockImportedComponents;
