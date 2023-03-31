import { hasOwn } from '../../shared/has-own';

type HypothesisWindowProps = {
  /** Function that returns configuration for the Hypothesis client */
  hypothesisConfig?: () => Record<string, unknown>;
};

/**
 * Return an object containing config settings from window.hypothesisConfig().
 *
 * Return an object containing config settings returned by the
 * window.hypothesisConfig() function provided by the host page:
 *
 *   {
 *     fooSetting: 'fooValue',
 *     barSetting: 'barValue',
 *     ...
 *   }
 *
 * If there's no window.hypothesisConfig() function then return {}.
 *
 * @param window_ - The window to search for a hypothesisConfig() function
 * @return Any config settings returned by hypothesisConfig()
 */
export function configFuncSettingsFrom(
  window_: Window & HypothesisWindowProps
): Record<string, unknown> {
  if (!hasOwn(window_, 'hypothesisConfig')) {
    return {};
  }

  if (typeof window_.hypothesisConfig !== 'function') {
    const docs =
      'https://h.readthedocs.io/projects/client/en/latest/publishers/config/#window.hypothesisConfig';
    console.warn('hypothesisConfig must be a function, see: ' + docs);
    return {};
  }

  return window_.hypothesisConfig();
}
