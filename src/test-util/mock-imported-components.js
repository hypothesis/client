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
 * @example
 *   import ComponentUnderTest, { $imports } from '../component-under-test';
 *
 *   beforeEach(() => {
 *     $imports.$mock(mockImportedComponents());
 *
 *     // Add additional mocks or overrides here.
 *   });
 *
 *   afterEach(() => {
 *     $imports.$restore();
 *   });
 *
 * @return {Function} - A function that can be passed to `$imports.$mock`.
 */
export default function mockImportedComponents() {
  return (source, symbol, value) => {
    if (!isComponent(value)) {
      return null;
    }

    const mock = props => props.children;

    // Make it possible to do `wrapper.find('ComponentName')` where `wrapper`
    // is an Enzyme wrapper.
    mock.displayName = getDisplayName(value);

    // Mocked components validate props in the same way as the real component.
    mock.propTypes = value.propTypes;

    return mock;
  };
}
