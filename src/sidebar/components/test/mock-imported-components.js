'use strict';

function isComponent(value) {
  return (
    typeof value === 'function' &&
    value.hasOwnProperty('propTypes') &&
    value.name.match(/^[A-Z]/)
  );
}

function getDisplayName(component) {
  return component.displayName || component.name || 'UnknownComponent';
}

/**
 * Helper for use with `babel-plugin-mockable-imports` that mocks components
 * imported by a file.
 *
 * Mocked components will have the same display name as the original component,
 * but will just render their children and not call the original implementation.
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
