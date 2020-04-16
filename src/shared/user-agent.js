/**
 * Helper methods to identify browser versions and os types
 */

/**
 * Returns true when the browser is IE11.
 *
 * @param _userAgent {string} - Test seam
 */
export const isIE11 = (_userAgent = window.navigator.userAgent) => {
  return _userAgent.indexOf('Trident/7.0') >= 0;
};

/**
 * Returns true when the OS is Mac OS.
 *
 * @param _userAgent {string} - Test seam
 */
export const isMacOS = (_userAgent = window.navigator.userAgent) => {
  return _userAgent.indexOf('Mac OS') >= 0;
};
