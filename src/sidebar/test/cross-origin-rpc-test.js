import { EventEmitter } from '../../shared/event-emitter';
import { startServer, preStartServer, $imports } from '../cross-origin-rpc';

class FakeWindow {
  constructor() {
    this.emitter = new EventEmitter();
    this.addEventListener = this.emitter.on.bind(this.emitter);
    this.removeEventListener = this.emitter.off.bind(this.emitter);
  }
}

describe('sidebar/cross-origin-rpc', () => {
  let fakeNormalizeGroupIds;
  let fakeStore;
  let fakeWarnOnce;
  let fakeWindow;
  let settings;
  let frame;

  beforeEach(() => {
    fakeStore = {
      allGroups: sinon.stub().returns([]),
      changeFocusModeUser: sinon.stub(),
      filterGroups: sinon.stub(),
      setContentInfo: sinon.stub(),
    };

    fakeNormalizeGroupIds = sinon.stub().returns(['1', '2']);

    frame = { postMessage: sinon.stub() };
    fakeWindow = new FakeWindow();

    settings = {
      rpcAllowedOrigins: ['https://allowed1.com', 'https://allowed2.com'],
    };

    fakeWarnOnce = sinon.stub();

    $imports.$mock({
      './helpers/groups': { normalizeGroupIds: fakeNormalizeGroupIds },
      '../shared/warn-once': { warnOnce: fakeWarnOnce },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#startServer', () => {
    it('sends a response with the "ok" result', () => {
      startServer(fakeStore, settings, fakeWindow);

      fakeWindow.emitter.emit('message', {
        data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
        origin: 'https://allowed1.com',
        source: frame,
      });

      assert.isTrue(frame.postMessage.calledOnce);

      assert.isTrue(
        frame.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            result: 'ok',
          },
          'https://allowed1.com',
        ),
      );
    });

    describe('on RPC request from embedder frame', () => {
      // Simulate an RPC call from the embedder (eg. LMS) frame to the sidebar.
      function callRPC(method, params) {
        fakeWindow.emitter.emit('message', {
          data: {
            jsonrpc: '2.0',
            method,
            id: 42,
            params,
          },
          origin: 'https://allowed1.com',
          source: frame,
        });
      }

      beforeEach(() => {
        sinon.stub(console, 'error');
      });

      afterEach(() => {
        console.error.restore();
      });

      describe('on "changeFocusModeUser" call', () => {
        it('sets the focused user', () => {
          startServer(fakeStore, settings, fakeWindow);

          callRPC('changeFocusModeUser', [
            { username: 'foobar', displayName: 'Simon Says' },
          ]);

          assert.calledWith(
            fakeStore.changeFocusModeUser,
            sinon.match({ username: 'foobar', displayName: 'Simon Says' }),
          );
        });

        context('groups provided', () => {
          it('normalizes any provided group IDs and sets filtered groups', () => {
            startServer(fakeStore, settings, fakeWindow);
            fakeStore.allGroups.returns(['1', '2', '3']);
            fakeNormalizeGroupIds.returns(['1', '2']);

            callRPC('changeFocusModeUser', [{ groups: ['1', '2', '3', '4'] }]);

            assert.calledWith(
              fakeNormalizeGroupIds,
              ['1', '2', '3', '4'],
              ['1', '2', '3'],
            );
            assert.calledWith(fakeStore.filterGroups, ['1', '2']);
            assert.notCalled(console.error);
          });

          it('logs an error if there are provided group IDs but none match any known groups', () => {
            startServer(fakeStore, settings, fakeWindow);
            fakeNormalizeGroupIds.returns([]);

            callRPC('changeFocusModeUser', [{ groups: ['1', '2', '3'] }]);

            assert.calledWith(
              console.error,
              'No matching groups found in list of filtered group IDs',
            );
            assert.calledWith(fakeStore.filterGroups, []);
          });
        });

        context('no groups provided', () => {
          it('sets filtered groups to an empty set', () => {
            startServer(fakeStore, settings, fakeWindow);
            fakeNormalizeGroupIds.returns([]);

            callRPC('changeFocusModeUser', [{ groups: [] }]);

            assert.calledWith(fakeStore.filterGroups, []);
            assert.notCalled(console.error);
          });
        });
      });

      describe('on "showContentInfo" call', () => {
        it('updates content info in store', () => {
          startServer(fakeStore, settings, fakeWindow);
          const contentInfo = { item: { title: 'Some article' } };

          callRPC('showContentInfo', [contentInfo]);

          assert.calledWith(fakeStore.setContentInfo, sinon.match(contentInfo));
        });
      });
    });

    it('calls the registered method with the provided params', () => {
      startServer(fakeStore, settings, fakeWindow);

      fakeWindow.emitter.emit('message', {
        data: {
          jsonrpc: '2.0',
          method: 'changeFocusModeUser',
          id: 42,
          params: ['one', 'two'],
        },
        origin: 'https://allowed1.com',
        source: frame,
      });

      assert.isTrue(fakeStore.changeFocusModeUser.calledWithExactly('one'));
    });

    it('calls the registered method with no params', () => {
      startServer(fakeStore, settings, fakeWindow);

      fakeWindow.emitter.emit('message', {
        data: {
          jsonrpc: '2.0',
          method: 'changeFocusModeUser',
          id: 42,
        },
        origin: 'https://allowed1.com',
        source: frame,
      });
      assert.isTrue(fakeStore.changeFocusModeUser.calledWithExactly(undefined));
    });

    it('does not call the unregistered method', () => {
      startServer(fakeStore, settings, fakeWindow);

      fakeWindow.emitter.emit('message', {
        data: {
          method: 'unregisteredMethod',
          id: 42,
        },
        origin: 'https://allowed1.com',
        source: frame,
      });
      assert.isTrue(fakeStore.changeFocusModeUser.notCalled);
    });

    [{}, null, { jsonrpc: '1.0' }].forEach(invalidMessage => {
      it('ignores non JSON-RPC messages', () => {
        const settings = { rpcAllowedOrigins: [] };
        startServer(fakeStore, settings, fakeWindow);

        fakeWindow.emitter.emit('message', {
          data: invalidMessage,
          origin: 'https://foo.com',
          source: frame,
        });

        assert.notCalled(fakeWarnOnce);
        assert.isTrue(frame.postMessage.notCalled);
      });
    });

    [
      {},
      { rpcAllowedOrigins: [] },
      { rpcAllowedOrigins: ['https://allowed1.com', 'https://allowed2.com'] },
    ].forEach(settings => {
      it("doesn't respond if the origin isn't allowed", () => {
        startServer(fakeStore, settings, fakeWindow);

        fakeWindow.emitter.emit('message', {
          origin: 'https://notallowed.com',
          data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
          source: frame,
        });

        assert.calledWith(
          fakeWarnOnce,
          sinon.match(/Ignoring JSON-RPC request from non-whitelisted origin/),
        );
        assert.isTrue(frame.postMessage.notCalled);
      });
    });

    it("responds with an error if there's no method", () => {
      startServer(fakeStore, settings, fakeWindow);
      const jsonRpcRequest = { jsonrpc: '2.0', id: 42 }; // No "method" member.

      fakeWindow.emitter.emit('message', {
        origin: 'https://allowed1.com',
        data: jsonRpcRequest,
        source: frame,
      });

      assert.isTrue(frame.postMessage.calledOnce);
      assert.isTrue(
        frame.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            error: {
              code: -32601,
              message: 'Method not found',
            },
          },
          'https://allowed1.com',
        ),
      );
    });

    ['unknownMethod', null].forEach(method => {
      it('responds with an error if the method is unknown', () => {
        startServer(fakeStore, settings, fakeWindow);

        fakeWindow.emitter.emit('message', {
          origin: 'https://allowed1.com',
          data: { jsonrpc: '2.0', method, id: 42 },
          source: frame,
        });

        assert.isTrue(frame.postMessage.calledOnce);
        assert.isTrue(
          frame.postMessage.calledWithExactly(
            {
              jsonrpc: '2.0',
              id: 42,
              error: {
                code: -32601,
                message: 'Method not found',
              },
            },
            'https://allowed1.com',
          ),
        );
      });
    });
  });

  describe('#preStartServer', () => {
    beforeEach(() => {
      preStartServer(fakeWindow);
    });

    it('responds to an incoming request that arrives before the server starts', () => {
      fakeWindow.emitter.emit('message', {
        data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
        origin: 'https://allowed1.com',
        source: frame,
      });
      startServer(fakeStore, settings, fakeWindow);
      assert.isTrue(
        frame.postMessage.calledWithExactly(
          {
            jsonrpc: '2.0',
            id: 42,
            result: 'ok',
          },
          'https://allowed1.com',
        ),
      );
    });

    it('responds to multiple incoming requests that arrive before the server starts', () => {
      const messageEvent = id => ({
        data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id },
        origin: 'https://allowed1.com',
        source: frame,
      });
      const response = id => [
        {
          jsonrpc: '2.0',
          id,
          result: 'ok',
        },
        'https://allowed1.com',
      ];

      fakeWindow.emitter.emit('message', messageEvent(42));
      fakeWindow.emitter.emit('message', messageEvent(43));
      fakeWindow.emitter.emit('message', messageEvent(44));

      startServer(fakeStore, settings, fakeWindow);

      assert.equal(frame.postMessage.callCount, 3);
      assert.isTrue(frame.postMessage.calledWithExactly(...response(42)));
      assert.isTrue(frame.postMessage.calledWithExactly(...response(43)));
      assert.isTrue(frame.postMessage.calledWithExactly(...response(44)));
    });

    it("does not respond to pre-start incoming requests if the origin isn't allowed", () => {
      fakeWindow.emitter.emit('message', {
        data: { jsonrpc: '2.0', method: 'changeFocusModeUser', id: 42 },
        origin: 'https://fake.com',
        source: frame,
      });
      startServer(fakeStore, settings, fakeWindow);

      assert.calledWith(
        fakeWarnOnce,
        sinon.match(/Ignoring JSON-RPC request from non-whitelisted origin/),
      );
    });
  });
});
