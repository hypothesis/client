import { delay } from '../../test-util/wait';
import { PortProvider } from '../port-provider';

const source = 'hypothesis';

describe('PortProvider', () => {
  let portProvider;

  function portFinderRequest({
    data,
    origin = window.location.origin,
    source = window,
  }) {
    const event = new MessageEvent('message', {
      data,
      origin,
      source,
    });

    window.dispatchEvent(event);

    return event;
  }

  beforeEach(() => {
    sinon.stub(window, 'postMessage');
    portProvider = new PortProvider(window.location.origin);
    portProvider.listen();
  });

  afterEach(() => {
    window.postMessage.restore();
    portProvider.destroy();
  });

  describe('#destroy', () => {
    it('ignores valid port request if `PortFinder` has been destroyed', async () => {
      portProvider.destroy();
      portFinderRequest({
        data: {
          channel: 'host-sidebar',
          port: 'sidebar',
          source,
          type: 'request',
        },
      });
      await delay(0);

      assert.notCalled(window.postMessage);
    });
  });

  describe('#getPort', () => {
    it('returns `null` if called with wrong arguments', () => {
      let hostPort;

      // Incorrect channel
      hostPort = portProvider.getPort({
        channel: 'notebook-sidebar',
        port: 'host',
      });
      assert.isNull(hostPort);

      // Incorrect port
      hostPort = portProvider.getPort({
        channel: 'host-sidebar',
        port: 'sidebar',
      });
      assert.isNull(hostPort);
    });

    it('returns the `host` port of the `host-sidebar` channel if called with the right arguments', () => {
      const hostPort = portProvider.getPort({
        channel: 'host-sidebar',
        port: 'host',
      });
      assert.exists(hostPort);
    });
  });

  describe('#listen', () => {
    it('ignores all port requests before `listen` is called', async () => {
      portProvider.destroy();
      portProvider = new PortProvider(window.location.origin);
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };
      portFinderRequest({
        data,
      });
      await delay(0);

      assert.notCalled(window.postMessage);

      portProvider.listen();
      portFinderRequest({
        data,
      });
      await delay(0);

      assert.calledOnce(window.postMessage);
    });
  });

  describe('listens for port requests', () => {
    it('ignores port requests with invalid sources', async () => {
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };

      portFinderRequest({
        data,
        source: null,
      });

      portFinderRequest({
        data,
        source: new MessageChannel().port1,
      });
      await delay(0);

      assert.notCalled(window.postMessage);
    });

    [
      // Disabled this check because it make axes-core to crash
      // Reported: https://github.com/dequelabs/axe-core/pull/3249
      //{ data: null, reason: 'if message is null' },
      {
        data: {
          channel: 'sidebar-host', // invalid channel (swapped words)
          port: 'sidebar',
          source,
          type: 'request',
        },
        reason: 'if message contains an invalid channel',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'host', // invalid port
          source,
          type: 'request',
        },
        reason: 'if message contains an invalid port',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'sidebar',
          source: 'dummy',
          type: 'request',
        },
        reason: 'if message contains an invalid source',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'dummy',
          source,
          type: 'offer', // invalid offer
        },
        reason: 'if message contains an invalid offer',
      },
      {
        data: {
          channel: 'host-sidebar',
          port: 'sidebar',
          source,
          type: 'request',
        },
        origin: 'https://dummy.com',
        reason: 'if message comes from invalid origin',
      },
    ].forEach(({ data, reason, origin }) => {
      it(`ignores port request ${reason}`, async () => {
        portFinderRequest({ data, origin: origin ?? window.location.origin });

        await delay(0);

        assert.notCalled(window.postMessage);
      });
    });

    it('responds to a valid port request', async () => {
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };
      portFinderRequest({
        data,
      });
      await delay(0);

      assert.calledWith(
        window.postMessage,
        { ...data, type: 'offer' },
        window.location.origin,
        [sinon.match.instanceOf(MessagePort)]
      );
    });

    it('responds to the first valid port request, ignore additional requests', async () => {
      const data = {
        channel: 'guest-host',
        port: 'guest',
        source,
        type: 'request',
      };

      for (let i = 0; i < 4; ++i) {
        portFinderRequest({
          data,
        });
      }
      await delay(0);

      assert.calledOnceWithExactly(
        window.postMessage,
        { ...data, type: 'offer' },
        window.location.origin,
        [sinon.match.instanceOf(MessagePort)]
      );
    });

    it('sends the counterpart port via the sidebar port', async () => {
      portFinderRequest({
        data: {
          channel: 'host-sidebar',
          port: 'sidebar',
          source,
          type: 'request',
        },
      });
      await delay(0);

      const [sidebarPort] = window.postMessage.getCall(0).args[2];
      const handler = sinon.stub();
      sidebarPort.onmessage = handler;

      const data = {
        channel: 'guest-sidebar',
        port: 'guest',
        source,
        type: 'request',
      };
      portFinderRequest({
        data,
      });
      await delay(0);

      assert.calledWith(
        handler,
        sinon.match({
          data: { ...data, type: 'offer' },
        })
      );
    });

    it('sends the counterpart port via the listener', async () => {
      const handler = sinon.stub();
      portProvider.on('hostPortRequest', handler);
      const data = {
        channel: 'guest-host',
        port: 'guest',
        source,
        type: 'request',
      };
      portFinderRequest({
        data,
      });
      await delay(0);

      assert.calledWith(handler, 'guest', sinon.match.instanceOf(MessagePort));
    });
  });
});
