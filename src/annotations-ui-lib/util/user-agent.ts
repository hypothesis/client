export const isMacOS = (_userAgent: string = window.navigator.userAgent) => {
  return _userAgent.indexOf('Mac OS') >= 0;
};

/**
 * Returns true when device is iOS.
 * https://stackoverflow.com/a/9039885/14463679
 */
export const isIOS = (
  _navigator: { platform: string; userAgent: string } = window.navigator,
  _ontouchend: boolean = 'ontouchend' in document,
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
