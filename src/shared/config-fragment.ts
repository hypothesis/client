/**
 * Encode app configuration in a URL fragment.
 *
 * This is used by the annotator to pass configuration to the sidebar and
 * notebook apps, which they can easily read on startup. The configuration is
 * passed in the fragment to avoid invalidating cache entries for the URL
 * or adding noise to server logs.
 *
 * @return URL with added fragment
 */
export function addConfigFragment(baseURL: string, config: object): string {
  const url = new URL(baseURL);
  const params = new URLSearchParams();
  params.append('config', JSON.stringify(config));
  url.hash = params.toString();
  return url.toString();
}

/**
 * Parse configuration from a URL generated by {@link addConfigFragment}.
 */
export function parseConfigFragment(url: string): Record<string, unknown> {
  const configStr = new URL(url).hash.slice(1);
  const configJSON = new URLSearchParams(configStr).get('config');
  return JSON.parse(configJSON || '{}');
}
