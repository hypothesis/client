/**
 * Generate a query string from a record of query parameters.
 *
 * The returned string does not have a leading "?" and the parameters are
 * sorted by name.
 *
 * @param {Record<string, string>} params
 * @return {string}
 */
export function stringify(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) =>
    searchParams.append(key, value)
  );
  searchParams.sort();
  return searchParams.toString();
}

/**
 * Parse a query string into a record of parameters.
 *
 * @param {string} query - Query string which may have a leading "?"
 * @return {Record<string, string>}
 */
export function parse(query) {
  const params = new URLSearchParams(query);
  /** @type {Record<string, string>} */
  const result = {};
  // @ts-expect-error - `URLSearchParams.entries` is missing.
  for (let [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}
