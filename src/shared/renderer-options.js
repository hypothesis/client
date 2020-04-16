import { options } from 'preact';

import { isIE11 } from './user-agent';

/**
 * Force the dir="auto" attribute to be dir="" as this otherwise causes
 * an exception in IE11 and breaks subsequent rendering.
 *
 * @param {Object} _options - Test seam
 */
export function setupIE11Fixes(_options = options) {
  if (isIE11()) {
    const prevHook = _options.vnode;
    _options.vnode = vnode => {
      if (typeof vnode.type === 'string') {
        if ('dir' in vnode.props && vnode.props.dir === 'auto') {
          // Re-assign `vnode.props.dir` if its value is "auto"
          vnode.props.dir = '';
        }
      }
      // Call previously defined hook if there was any
      if (prevHook) {
        prevHook(vnode);
      }
    };
  }
}
