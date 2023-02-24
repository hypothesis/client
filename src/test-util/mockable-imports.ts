export interface Imports {
  $mock(mocks: object): void;
  $restore(): void;
}

/**
 * Return the `$imports` object for a module that can be used to mock
 * dependencies in tests.
 *
 * @param module - Object containing all of the exports of the module to mock
 */
export function getImports<T>(module: T): Imports {
  return (module as any).$imports;
}
