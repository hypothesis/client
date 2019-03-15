'use strict';

const crossOriginRPC = require('../cross-origin-rpc');

describe('crossOriginRPC', function() {
  describe('server', function() {
    let addedListener; // The postMessage() listener that the server adds.
    let fakeStore;
    let fakeWindow;
    let settings;
    let source;

    beforeEach(function() {
      fakeStore = {
        searchUris: sinon.stub().returns('THE_SEARCH_URIS'),
      };

      fakeWindow = {
        addEventListener: sinon.stub().callsFake(function(type, listener) {
          // Save the registered listener function in a variable so test code
          // can access it later.
          addedListener = listener;
        }),
      };

      settings = {
        rpcAllowedOrigins: ['https://allowed1.com', 'https://allowed2.com'],
      };

      source = { postMessage: sinon.stub() };
    });

    /**
     * Directly call the postMessage() listener func that the server
     * registered. This simulates what would happen if window.postMessage()
     * were called.
     */
    function postMessage(event) {
      addedListener(event);
    }

    it('adds a postMessage() event listener function', function() {
      crossOriginRPC.server.start(fakeStore, {}, fakeWindow);

      assert.isTrue(fakeWindow.addEventListener.calledOnce);
      assert.isTrue(fakeWindow.addEventListener.calledWith('message'));
    });

    it('sends a response with the result from the called method', function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

      postMessage({
        data: { method: 'searchUris', id: 42 },
        origin: 'https://allowed1.com',
        source: source,
      });

      assert.isTrue(source.postMessage.calledOnce);
      assert.isTrue(
        source.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            result: 'THE_SEARCH_URIS',
          },
          'https://allowed1.com'
        )
      );
    });

    [
      {},
      { rpcAllowedOrigins: [] },
      { rpcAllowedOrigins: ['https://allowed1.com', 'https://allowed2.com'] },
    ].forEach(function(settings) {
      it("doesn't respond if the origin isn't allowed", function() {
        crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

        postMessage({
          origin: 'https://notallowed.com',
          data: { method: 'searchUris', id: 42 },
          source: source,
        });

        assert.isTrue(source.postMessage.notCalled);
      });
    });

    it("responds with an error if there's no method", function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);
      let jsonRpcRequest = { id: 42 }; // No "method" member.

      postMessage({
        origin: 'https://allowed1.com',
        data: jsonRpcRequest,
        source: source,
      });

      assert.isTrue(source.postMessage.calledOnce);
      assert.isTrue(
        source.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            error: {
              code: -32601,
              message: 'Method not found',
            },
          },
          'https://allowed1.com'
        )
      );
    });

    ['unknownMethod', null].forEach(function(method) {
      it('responds with an error if the method is unknown', function() {
        crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

        postMessage({
          origin: 'https://allowed1.com',
          data: { method: method, id: 42 },
          source: source,
        });

        assert.isTrue(source.postMessage.calledOnce);
        assert.isTrue(
          source.postMessage.calledWithExactly(
            {
              jsonrpc: '2.0',
              id: 42,
              error: {
                code: -32601,
                message: 'Method not found',
              },
            },
            'https://allowed1.com'
          )
        );
      });
    });
  });
});
