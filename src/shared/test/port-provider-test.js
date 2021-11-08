import { delay } from '../../test-util/wait';
import { PortProvider } from '../port-provider';
import { SOURCE as source } from '../port-util';

describe('PortProvider', () => {
  let portProvider;

  function sendMessage({
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
    portProvider = new PortProvider(window.location.href);
  });

  afterEach(() => {
    window.postMessage.restore();
    portProvider.destroy();
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

  describe('#destroy', () => {
    it('ignores valid port request if `PortFinder` has been destroyed', async () => {
      portProvider.destroy();
      sendMessage({
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

  describe('listens for port requests', () => {
    it('ignores port requests with invalid sources', async () => {
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };

      sendMessage({
        data,
        source: null,
      });

      sendMessage({
        data,
        source: new MessageChannel().port1,
      });

      await delay(0);

      assert.notCalled(window.postMessage);
    });

    it('ignores port request with invalid message data', async () => {
      sendMessage({
        data: {
          channel: 'dummy1-dummy2', // invalid channel
          port: 'sidebar',
          source,
          type: 'request',
        },
      });

      // Disabled this check because it make axes-core to crash
      // Reported: https://github.com/dequelabs/axe-core/pull/3249
      // sendMessage({
      //   data: null,
      // });

      await delay(0);

      assert.notCalled(window.postMessage);
    });

    it('ignores port request with invalid message origin', async () => {
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };
      sendMessage({
        data,
        origin: 'https://dummy.com',
      });

      await delay(0);

      assert.notCalled(window.postMessage);
    });

    it('responds to a valid port request', async () => {
      const data = {
        channel: 'host-sidebar',
        port: 'sidebar',
        source,
        type: 'request',
      };
      sendMessage({
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

    it('sends the reciprocal port of the `guest-sidebar` channel (via the sidebar port)', async () => {
      sendMessage({
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
      sendMessage({
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

    it('sends the reciprocal port of the `guest-host` channel (via listener)', async () => {
      const handler = sinon.stub();
      portProvider.addEventListener('onHostPortRequest', handler);
      const data = {
        channel: 'guest-host',
        port: 'guest',
        source,
        type: 'request',
      };
      sendMessage({
        data,
      });
      await delay(0);

      assert.calledWith(handler, sinon.match.instanceOf(MessagePort), 'guest');
    });
  });
});
