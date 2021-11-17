import { delay } from '../../test-util/wait';
import { PortFinder } from '../port-finder';

const MAX_WAIT_FOR_PORT = 1000 * 5;

describe('PortFinder', () => {
  const frame1 = 'guest';
  const type = 'offer';
  let portFinder;
  let portFinders;

  function createPortFinder(source = frame1) {
    const instance = new PortFinder({ hostFrame: window, source });
    portFinders.push(instance);
    return instance;
  }

  function sendPortProviderOffer({ data, ports = [] }) {
    const event = new MessageEvent('message', {
      data,
      ports,
    });

    window.dispatchEvent(event);

    return event;
  }

  beforeEach(() => {
    portFinders = [];
    sinon.stub(window, 'postMessage');
    portFinder = createPortFinder();
  });

  afterEach(() => {
    window.postMessage.restore();
    portFinders.forEach(instance => instance.destroy());
  });

  describe('#destroy', () => {
    it('ignores subsequent `offer` messages of ports', async () => {
      let error;
      const target = 'host';
      const { port1 } = new MessageChannel();
      const clock = sinon.useFakeTimers();

      try {
        portFinder.discover(target).catch(e => (error = e));

        portFinder.destroy();

        sendPortProviderOffer({
          data: {
            frame1,
            frame2: target,
            type,
          },
          ports: [port1],
        });
        clock.tick(MAX_WAIT_FOR_PORT);
      } finally {
        clock.restore();
      }

      await delay(0);

      assert.equal(
        error.message,
        'Unable to establish guest-host communication channel'
      );
    });
  });

  describe('#discover', () => {
    ['guest', 'invalid'].forEach(target =>
      it('rejects if requesting an invalid port', async () => {
        let error;
        try {
          await portFinder.discover(target);
        } catch (e) {
          error = e;
        }
        assert.equal(error.message, 'Invalid request of channel/port');
      })
    );

    [
      { source: 'guest', target: 'host' },
      { source: 'guest', target: 'sidebar' },
      { source: 'sidebar', target: 'host' },
      { source: 'notebook', target: 'sidebar' },
    ].forEach(({ source, target }) =>
      it('resolves if requesting a valid port', async () => {
        const { port1 } = new MessageChannel();
        let resolvedPort;
        portFinder = createPortFinder(source);

        portFinder.discover(target).then(port => (resolvedPort = port));
        sendPortProviderOffer({
          data: {
            frame1: source,
            frame2: target,
            type,
          },
          ports: [port1],
        });
        await delay(0);

        assert.instanceOf(resolvedPort, MessagePort);
      })
    );

    it("times out if host doesn't respond", async () => {
      let error;
      const target = 'host';
      const clock = sinon.useFakeTimers();

      try {
        portFinder.discover(target).catch(e => (error = e));
        clock.tick(MAX_WAIT_FOR_PORT);
      } finally {
        clock.restore();
      }

      assert.callCount(window.postMessage, 21);
      assert.alwaysCalledWithExactly(
        window.postMessage,
        { frame1, frame2: target, type: 'request' },
        '*'
      );

      await delay(0);

      assert.equal(
        error.message,
        'Unable to establish guest-host communication channel'
      );
    });
  });
});
