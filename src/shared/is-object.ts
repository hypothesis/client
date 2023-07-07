export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}
