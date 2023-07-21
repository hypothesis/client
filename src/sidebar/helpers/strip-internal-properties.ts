/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 */
export function stripInternalProperties(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('$')) {
      result[key] = value;
    }
  }
  return result;
}
