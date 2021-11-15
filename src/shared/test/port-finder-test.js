import { delay } from '../../test-util/wait';
import { PortFinder } from '../port-finder';

const MAX_WAIT_FOR_PORT = 1000 * 5;

describe('PortFinder', () => {
  let portFinder;

  function portProviderOffer({ data, ports = [] }) {
    const event = new MessageEvent('message', {
      data,
      ports,
    });

    window.dispatchEvent(event);

    return event;
  }

  beforeEach(() => {
    sinon.stub(window, 'postMessage');
    portFinder = new PortFinder();
  });

  afterEach(() => {
    window.postMessage.restore();
    portFinder.destroy();
  });

  describe('#destroy', () => {
    it('ignores subsequent `offer` messages of ports', async () => {
      let error;
      const channel = 'host-sidebar';
      const port = 'sidebar';
      const { port1 } = new MessageChannel();
      const clock = sinon.useFakeTimers();

      try {
        portFinder
          .discover({
            channel,
            hostFrame: window,
            port,
          })
          .catch(e => (error = e));
        portFinder.destroy();
        portProviderOffer({
          data: { channel, port, source: 'hypothesis', type: 'offer' },
          ports: [port1],
        });
        clock.tick(MAX_WAIT_FOR_PORT);
      } finally {
        clock.restore();
      }

      await delay(0);

      assert.equal(
        error.message,
        "Unable to find 'sidebar' port on 'host-sidebar' channel"
      );
    });
  });

  describe('#discover', () => {
    [
      { channel: 'invalid', port: 'guest' },
      { channel: 'guest-host', port: 'invalid' },
      { channel: 'guest-host', port: 'host' },
    ].forEach(({ channel, port }) =>
      it('rejects if requesting an invalid port', async () => {
        let error;
        try {
          await portFinder.discover({
            channel,
            hostFrame: window,
            port,
          });
        } catch (e) {
          error = e;
        }
        assert.equal(error.message, 'Invalid request of channel/port');
      })
    );

    [
      { channel: 'guest-host', port: 'guest' },
      { channel: 'guest-sidebar', port: 'guest' },
      { channel: 'host-sidebar', port: 'sidebar' },
      { channel: 'notebook-sidebar', port: 'notebook' },
    ].forEach(({ channel, port }) =>
      it('resolves if requesting a valid port', async () => {
        const { port1 } = new MessageChannel();
        let resolvedPort;

        portFinder
          .discover({
            channel,
            hostFrame: window,
            port,
          })
          .then(port => (resolvedPort = port));
        portProviderOffer({
          data: { channel, port, source: 'hypothesis', type: 'offer' },
          ports: [port1],
        });
        await delay(0);

        assert.instanceOf(resolvedPort, MessagePort);
      })
    );

    it("times out if host doesn't respond", async () => {
      let error;
      const channel = 'host-sidebar';
      const port = 'sidebar';
      const clock = sinon.useFakeTimers();

      try {
        portFinder
          .discover({
            channel,
            hostFrame: window,
            port,
          })
          .catch(e => (error = e));
        clock.tick(MAX_WAIT_FOR_PORT);
      } finally {
        clock.restore();
      }

      assert.callCount(window.postMessage, 21);
      assert.alwaysCalledWithExactly(
        window.postMessage,
        { channel, port, source: 'hypothesis', type: 'request' },
        '*'
      );

      await delay(0);

      assert.equal(
        error.message,
        "Unable to find 'sidebar' port on 'host-sidebar' channel"
      );
    });
  });
});
