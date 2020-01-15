import crossOriginRPC from '../cross-origin-rpc';
import { $imports } from '../cross-origin-rpc';

describe('crossOriginRPC', function() {
  describe('server', function() {
    let addedListener; // The postMessage() listener that the server adds.
    let fakeStore;
    let fakeWarnOnce;
    let fakeWindow;
    let settings;
    let source;

    beforeEach(function() {
      fakeStore = {
        changeFocusModeUser: sinon.stub(),
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

      fakeWarnOnce = sinon.stub();

      $imports.$mock({
        '../shared/warn-once': fakeWarnOnce,
      });
    });

    afterEach(() => {
      $imports.$restore();
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

    it('sends a response with the "ok" result', function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

      postMessage({
        data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
        origin: 'https://allowed1.com',
        source: source,
      });

      assert.isTrue(source.postMessage.calledOnce);

      assert.isTrue(
        source.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            result: 'ok',
          },
          'https://allowed1.com'
        )
      );
    });

    it('calls the registered method with the provided params', function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

      postMessage({
        data: {
          jsonrpc: '2.0',
          method: 'changeFocusModeUser',
          id: 42,
          params: ['one', 'two'],
        },
        origin: 'https://allowed1.com',
        source: source,
      });
      assert.isTrue(
        fakeStore.changeFocusModeUser.calledWithExactly('one', 'two')
      );
    });

    it('calls the registered method with no params', function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

      postMessage({
        data: {
          jsonrpc: '2.0',
          method: 'changeFocusModeUser',
          id: 42,
        },
        origin: 'https://allowed1.com',
        source: source,
      });
      assert.isTrue(fakeStore.changeFocusModeUser.calledWithExactly());
    });

    it('does not call the unregistered method', function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

      postMessage({
        data: {
          method: 'unregisteredMethod',
          id: 42,
        },
        origin: 'https://allowed1.com',
        source: source,
      });
      assert.isTrue(fakeStore.changeFocusModeUser.notCalled);
    });

    [{}, null, { jsonrpc: '1.0' }].forEach(invalidMessage => {
      it('ignores non JSON-RPC messages', () => {
        const settings = { rpcAllowedOrigins: [] };
        crossOriginRPC.server.start(fakeStore, settings, fakeWindow);

        postMessage({ data: invalidMessage, origin: 'https://foo.com' });

        assert.notCalled(fakeWarnOnce);
        assert.isTrue(source.postMessage.notCalled);
      });
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
          data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
          source: source,
        });

        assert.calledWith(
          fakeWarnOnce,
          sinon.match(/Ignoring JSON-RPC request from non-whitelisted origin/)
        );
        assert.isTrue(source.postMessage.notCalled);
      });
    });

    it("responds with an error if there's no method", function() {
      crossOriginRPC.server.start(fakeStore, settings, fakeWindow);
      let jsonRpcRequest = { jsonrpc: '2.0', id: 42 }; // No "method" member.

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
          data: { jsonrpc: '2.0', method: method, id: 42 },
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
