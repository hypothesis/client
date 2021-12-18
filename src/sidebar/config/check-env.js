import { parseConfigFragment } from '../../shared/config-fragment';

/**
 * Perform checks for situations in which the Hypothesis client might not work
 * properly.
 *
 * This function does not check for supported browser features. That is handled
 * by the boot script.
 *
 * @param {Window} window
 * @return {boolean} `true` if the checks passed
 */
export function checkEnvironment(window) {
  const { version, origin } = parseConfigFragment(window.location.href);

  // If the sidebar and annotator code are using different versions of the
  // client, there might be a protocol mismatch in sidebar <-> guest/host RPC
  // calls. This can happen if an old version of the client has been cached
  // on the host/sidebar side. We try to set appropriate headers on the boot
  // script to minimize the chances of this happening, but there are still
  // situations beyond our control where it can happen.
  if (version !== '__VERSION__') {
    console.warn(
      `The Hypothesis sidebar is using a different version (__VERSION__) than the host page (${version}). It may not work.`
    );
    return false;
  }

  // The sidebar can't work if loaded in the wrong origin or an opaque origin
  // because various cross-frame messaging (eg. login window, host <-> sidebar
  // RPC) set an origin filter on `postMessage` calls to the sidebar frame for
  // security.
  if (window.origin === 'null') {
    console.warn(
      `Hypothesis has been loaded in a sandboxed frame. This is not supported.`
    );
    return false;
  } else if (window.origin !== origin) {
    console.warn(
      `The Hypothesis sidebar is running in a different origin (${window.origin}) than expected (${origin}). It may not work.`
    );
    return false;
  }

  return true;
}
