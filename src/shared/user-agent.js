/**
 * Helper methods to identify browser versions and os types
 */

/**
 * Returns true when the OS is Mac OS.
 *
 * @param _userAgent {string} - Test seam
 */
export const isMacOS = (_userAgent = window.navigator.userAgent) => {
  return _userAgent.indexOf('Mac OS') >= 0;
};

/**
 * Returns true when device is iOS.
 * https://stackoverflow.com/a/9039885/14463679
 *
 * @param _navigator {{platform: string, userAgent: string}}
 * @param _ontouchend {boolean}
 */
export const isIOS = (
  _navigator = window.navigator,
  _ontouchend = 'ontouchend' in document
) => {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod',
    ].includes(_navigator.platform) ||
    // iPad on iOS 13 detection
    (_navigator.userAgent.includes('Mac') && _ontouchend)
  );
};
