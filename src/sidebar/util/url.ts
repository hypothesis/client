import { hasOwn } from '../../shared/has-own';

/**
 * Replace parameters in a URL template with values from a `params` object.
 *
 * Returns an object containing the expanded URL and a dictionary of unused
 * parameters.
 *
 *   replaceURLParams('/things/:id', {id: 'foo', q: 'bar'}) =>
 *     {url: '/things/foo', unusedParams: {q: 'bar'}}
 */
export function replaceURLParams<Param>(
  url: string,
  params: Record<string, Param>
): { url: string; unusedParams: Record<string, Param> } {
  const unusedParams: Record<string, Param> = {};
  for (const param in params) {
    if (hasOwn(params, param)) {
      const value = params[param];
      const urlParam = ':' + param;
      if (url.indexOf(urlParam) !== -1) {
        url = url.replace(urlParam, encodeURIComponent(String(value)));
      } else {
        unusedParams[param] = value;
      }
    }
  }
  return { url, unusedParams };
}

/**
 * Resolve a relative URL against a base URL to get an absolute URL.
 */
export function resolve(relativeURL: string, baseURL: string): string {
  return new URL(relativeURL, baseURL).href;
}
