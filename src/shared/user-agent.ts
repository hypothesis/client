/**
 * Helper methods to identify browser versions and os types
 */

/**
 * Returns true when the OS is Mac OS.
 *
 * @param _userAgent - Test seam
 */
export const isMacOS = (_userAgent: string = window.navigator.userAgent) => {
  return _userAgent.indexOf('Mac OS') >= 0;
};

/**
 * Returns true when device is iOS.
 * https://stackoverflow.com/a/9039885/14463679
 */
export const isIOS = (
  _navigator: { platform: string; userAgent: string } = window.navigator,
  _ontouchend: boolean = 'ontouchend' in document
): boolean => {
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

/**
 * Returns true when the device is a touch device such
 * as android or iOS.
 * https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer#browser_compatibility
 */
export const isTouchDevice = (_window: Window = window): boolean => {
  return _window.matchMedia('(pointer: coarse)').matches;
};
