/**
 * Types of value which `stringify` can serialize.
 *
 * @typedef {string|number|boolean} Param
 */

/**
 * Record mapping query parameter names to value or values (if the parameter
 * should be repeated).
 *
 * @typedef {Record<string, Param|Param[]>} Params
 */

/**
 * Generate a query string from a record of query parameters.
 *
 * The returned string does not have a leading "?" and the parameters are
 * sorted by name. If the value is an array then the query parameter is added
 * multiple times, once per value.
 *
 * @example
 *   stringify({ foo: 'bar', meep: 'one two' }) // Returns "foo=bar&meep=one+two"
 *   stringify({ foo: ['bar', 'baz'] }) // Returns "foo=bar&foo=baz"
 *
 * @param {Params} params
 * @return {string}
 */
export function stringify(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v.toString()));
    } else {
      searchParams.append(key, value.toString());
    }
  });
  searchParams.sort();
  return searchParams.toString();
}

/**
 * Parse a query string into a record of parameters.
 *
 * Non-repeated parameters are returned as strings, repeated parameters are
 * returned as an array of values.
 *
 * @param {string} query - Query string which may have a leading "?"
 * @return {Record<string, string|string[]>}
 */
export function parse(query) {
  const params = new URLSearchParams(query);
  /** @type {Record<string, string|string[]>} */
  const result = Object.create(null);
  for (let key of params.keys()) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

/**
 * Parse a query string into a record of parameters.
 *
 * This differs from `parse` in that if a parameter is repeated, only the last
 * value is returned.
 *
 * @param {string} query - Query string which may have a leading "?"
 * @return {Record<string, string>}
 */
export function parseLast(query) {
  const params = new URLSearchParams(query);
  /** @type {Record<string, string>} */
  const result = Object.create(null);
  for (let [key, value] of params) {
    result[key] = value;
  }
  return result;
}
