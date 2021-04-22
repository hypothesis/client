/**
 * Replace parameters in a URL template with values from a `params` object.
 *
 * Returns an object containing the expanded URL and a dictionary of unused
 * parameters.
 *
 *   replaceURLParams('/things/:id', {id: 'foo', q: 'bar'}) =>
 *     {url: '/things/foo', unusedParams: {q: 'bar'}}
 *
 * @param {string} url
 * @param {Record<string, string>} params
 * @return {{ url: string, unusedParams: Record<string, string>}}
 */
export function replaceURLParams(url, params) {
  /** @type {Record<string, string>} */
  const unusedParams = {};
  for (const param in params) {
    if (params.hasOwnProperty(param)) {
      const value = params[param];
      const urlParam = ':' + param;
      if (url.indexOf(urlParam) !== -1) {
        url = url.replace(urlParam, encodeURIComponent(value));
      } else {
        unusedParams[param] = value;
      }
    }
  }
  return { url, unusedParams };
}

/**
 * Resolve a relative URL against a base URL to get an absolute URL.
 *
 * @param {string} relativeURL
 * @param {string} baseURL
 */
export function resolve(relativeURL, baseURL) {
  return new URL(relativeURL, baseURL).href;
}
