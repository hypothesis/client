import hostConfig from '../host-config';
import * as postMessageJsonRpc from './postmessage-json-rpc';

// Global embedder ancestor frame handle that is capable 
// of sending and receiving RPC requests.
let _ancestor = null;

/** 
 *  Returns the global embedder ancestor frame
 *  @return {Promise<Window>}
 */
export async function ancestor() {
  if (_ancestor) {
    return Promise.resolve(_ancestor);
  }
  _ancestor = await findTrueAncestor();
  return _ancestor;
}

/** 
 * Iteratively discoverers all parent iframes and 
 * returns them in a list.
 * @return {Window[]}
 */
function getAncestors(window_) {
  if (window_ === window_.top) {
    return [];
  }

  // nb. The top window's `parent` is itself!
  const ancestors = [];
  do {
    window_ = window_.parent;
    ancestors.push(window_);
  } while (window_ !== window_.top);

  return ancestors;
}
/** 
 * Sends out an RPC request to every parent iframe. The
 * first one to respond back with an acknowledgement is
 * assumed to be the controlling embedder frame that will
 * later be used to send along its config and communicate
 * with the client.
 * 
 * @param {Window=} - The current window frame of this sidebar.
 * @return {Window} - The discovered ancestor frame.
 */
async function findTrueAncestor(window_ = window) {
  const configResponses = [];
  const hostPageConfig = hostConfig(window_);
  const origin = hostPageConfig.requestConfigFromFrame;

  const ancestors = getAncestors(window_);
  for (let i = 0; i <  ancestors.length; i++) {
    const ancestor = ancestors[i];
    const timeout = 3000;
    const result = postMessageJsonRpc.call(
      ancestor,
      origin,
      'requestFrame',
      // Round trip a unique index so we can match up 
      // the result to a local frame.
      [{index: i}], 
      timeout,
    );
    configResponses.push(result);
  }

  if (configResponses.length === 0) {
    configResponses.push(Promise.reject(new Error('Client is top frame')));
  }
  const result = await Promise.race(configResponses);
  // result.index will match the index into the ancestors array 
  // that we sent the winning request to.
  return ancestors[result.index];
}

