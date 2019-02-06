'use strict';

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
 * notifications) without any parameters and sending back a successful
 * response. Notifications (JSON-RPC calls that don't require a response),
 * method parameters, and error responses are not yet supported.
 *
 */
// @ngInject
function start(store, settings, $window) {
  $window.addEventListener('message', function receiveMessage(event) {
    let allowedOrigins = settings.rpcAllowedOrigins || [];

    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    // The entire JSON-RPC request object is contained in the postMessage()
    // data param.
    let jsonRpcRequest = event.data;

    event.source.postMessage(jsonRpcResponse(jsonRpcRequest), event.origin);
  });

  /** Return a JSON-RPC response to the given JSON-RPC request object. */
  function jsonRpcResponse(request) {
    // The set of methods that clients can call.
    let methods = {
      searchUris: store.searchUris,
    };

    let method = methods[request.method];

    let response = {
      jsonrpc: '2.0',
      id: request.id,
    };

    if (method) {
      response.result = method();
    } else {
      response.error = {
        code: -32601,
        message: 'Method not found',
      };
    }

    return response;
  }
}

module.exports = {
  server: {
    start: start,
  },
};
