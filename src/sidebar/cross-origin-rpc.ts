import { warnOnce } from '../shared/warn-once';
import type { ContentInfoConfig } from '../types/annotator';
import type { SidebarSettings } from '../types/config';
import type { FocusUserInfo } from '../types/rpc';
import { normalizeGroupIds } from './helpers/groups';
import type { SidebarStore } from './store';

/**
 * List of not-yet-processed messages received during application startup.
 */
let preStartQueue: MessageEvent[] = [];

/**
 * Return the mapped methods that can be called remotely via this server.
 *
 * @param store - The global store
 */
const registeredMethods = (store: SidebarStore) => {
  return {
    changeFocusModeUser: (userInfo: FocusUserInfo) => {
      store.changeFocusModeUser(userInfo);

      const groupIds = userInfo?.groups ?? [];
      const filteredGroupIds = normalizeGroupIds(groupIds, store.allGroups());
      if (groupIds.length && !filteredGroupIds.length) {
        console.error('No matching groups found in list of filtered group IDs');
      }
      store.filterGroups(filteredGroupIds);
    },

    showContentInfo: (contentInfo: ContentInfoConfig) => {
      store.setContentInfo(contentInfo);
    },
  };
};

/**
 * See https://www.jsonrpc.org/specification#request_object.
 */
type JSONRPCRequest = {
  jsonrpc: string;
  id: string;
  method: string;
  params?: unknown[];
};

/**
 * Return true if `data` "looks like" a JSON-RPC message.
 */
function isJSONRPCRequest(data: any): data is JSONRPCRequest {
  // eslint-disable-next-line eqeqeq
  if (data == null || typeof data !== 'object') {
    return false;
  }
  return data.jsonrpc === '2.0';
}

/**
 * Begin responding to JSON-RPC requests from frames on other origins.
 *
 * Register a window.postMessage() event listener that receives and responds to
 * JSON-RPC requests sent by frames on other origins using postMessage() as the
 * transport layer.
 *
 * Only frames whose origin is in the rpcAllowedOrigins config setting will be
 * responded to.
 *
 * This is a very partial implementation of a JSON-RPC 2.0 server:
 *
 * http://www.jsonrpc.org/specification
 *
 * The only part that we support so far is receiving JSON-RPC 2.0 requests (not
 * notifications) and sending back a successful "ok" response.
 *
 * All methods called upon must be mapped in the `registeredMethods` function.
 *
 * @inject
 */
export function startServer(
  store: SidebarStore,
  settings: SidebarSettings,
  $window: Window,
) {
  const methods: Record<string, (...args: any[]) => void> =
    registeredMethods(store);

  // Process the pre-start incoming RPC requests
  preStartQueue.forEach(event => {
    receiveMessage(event);
  });
  // Clear the queue and remove the preStartMessageListener
  preStartQueue = [];
  window.removeEventListener('message', preStartMessageListener);

  // Start listening to new RPC requests
  $window.addEventListener('message', receiveMessage);

  function receiveMessage(event: MessageEvent) {
    const allowedOrigins = settings.rpcAllowedOrigins || [];

    if (!isJSONRPCRequest(event.data)) {
      return;
    }

    if (!allowedOrigins.includes(event.origin)) {
      warnOnce(
        `Ignoring JSON-RPC request from non-whitelisted origin ${event.origin}`,
      );
      return;
    }

    // The entire JSON-RPC request object is contained in the postMessage()
    // data param.
    const jsonRpcRequest = event.data;

    const source = event.source as Window;
    source.postMessage(jsonRpcResponse(jsonRpcRequest), event.origin);
  }

  /**
   * Return a JSON-RPC response to the given JSON-RPC request object.
   */
  function jsonRpcResponse(request: JSONRPCRequest) {
    const method = methods[request.method];

    // Return an error response if the method name is not registered with
    // registeredMethods.
    if (method === undefined) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' },
      };
    }

    // Call the method and return the result response.
    if (request.params) {
      method(...request.params);
    } else {
      method();
    }
    return { jsonrpc: '2.0', result: 'ok', id: request.id };
  }
}

/**
 * Queues all incoming RPC requests so they can be handled later.
 *
 * @param event - RPC event payload
 */
function preStartMessageListener(event: MessageEvent) {
  preStartQueue.push(event);
}

/**
 * Start listening to incoming RPC requests right away so they don't timeout. These
 * requests are saved until the server starts up and then they can be handled accordingly.
 *
 * Why?
 *
 * This allows the client to fetch its config from the parent app frame and potentially
 * receive new unsolicited incoming requests that the parent app may send before this
 * RPC server starts.
 */
export function preStartServer(window_: Window = window) {
  window_.addEventListener('message', preStartMessageListener);
}
