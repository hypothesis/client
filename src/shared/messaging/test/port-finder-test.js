import { delay } from '@hypothesis/frontend-testing';

import {
  MAX_WAIT_FOR_PORT,
  POLLING_INTERVAL_FOR_PORT,
  PortFinder,
  PortRequestError,
  $imports,
} from '../port-finder';

const requestId = 'abcdef';

describe('PortFinder', () => {
  let fakeGenerateHexString;

  const frame1 = 'guest';
  const type = 'offer';
  let portFinder;
  let portFinders;

  function createPortFinder(source = frame1, sourceId) {
    const instance = new PortFinder({ hostFrame: window, source, sourceId });
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

  // Generate predictable IDs for port requests
  fakeGenerateHexString = sinon.stub().returns(requestId);

  beforeEach(() => {
    portFinders = [];
    sinon.stub(window, 'postMessage');
    portFinder = createPortFinder();

    $imports.$mock({
      '../random': { generateHexString: fakeGenerateHexString },
    });
  });

  afterEach(() => {
    $imports.$restore();
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

      assert.instanceOf(error, PortRequestError);
      assert.equal(
        error.message,
        'Unable to establish guest-host communication channel',
      );
    });
  });

  describe('#discover', () => {
    it('sends port request to host frame', async () => {
      const clock = sinon.useFakeTimers();
      try {
        portFinder = createPortFinder('guest', 'guest-id');
        portFinder.discover('sidebar');
        clock.tick(POLLING_INTERVAL_FOR_PORT);

        assert.calledWith(
          window.postMessage,
          {
            frame1: 'guest',
            frame2: 'sidebar',
            type: 'request',
            requestId,
            sourceId: 'guest-id',
          },
          '*',
        );
      } finally {
        clock.restore();
      }
    });

    [
      { source: 'guest', target: 'host' },
      { source: 'guest', target: 'sidebar' },
      { source: 'sidebar', target: 'host' },
      { source: 'notebook', target: 'sidebar' },
    ].forEach(({ source, target }) =>
      it('resolves when port is returned', async () => {
        const { port1 } = new MessageChannel();
        let resolvedPort;
        portFinder = createPortFinder(source);

        portFinder.discover(target).then(port => (resolvedPort = port));
        sendPortProviderOffer({
          data: {
            frame1: source,
            frame2: target,
            type,
            requestId,
          },
          ports: [port1],
        });
        await delay(0);

        assert.instanceOf(resolvedPort, MessagePort);
      }),
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

      const expectedCalls =
        Math.floor(MAX_WAIT_FOR_PORT / POLLING_INTERVAL_FOR_PORT) + 1;

      assert.callCount(window.postMessage, expectedCalls);
      assert.alwaysCalledWithExactly(
        window.postMessage,
        {
          frame1,
          frame2: target,
          type: 'request',
          requestId,
          sourceId: undefined,
        },
        '*',
      );

      await delay(0);

      assert.instanceOf(error, PortRequestError);
      assert.equal(
        error.message,
        'Unable to establish guest-host communication channel',
      );
    });

    it('rejects if host frame rejects port request with an explicit reason', async () => {
      let error;

      const done = portFinder.discover('host').catch(e => (error = e));

      sendPortProviderOffer({
        data: {
          frame1: 'guest',
          frame2: 'host',
          requestId,
          type: 'offer',
          error: 'Host frame says no',
        },
      });

      await done;

      assert.instanceOf(error, PortRequestError);
      assert.equal(error.message, 'Host frame says no');
    });

    it('rejects if host frame does not send a port', async () => {
      let error;

      const done = portFinder.discover('host').catch(e => (error = e));

      sendPortProviderOffer({
        // This is a valid response, except that the ports are missing.
        data: {
          frame1: 'guest',
          frame2: 'host',
          requestId,
          type: 'offer',
        },
      });

      await done;

      assert.instanceOf(error, PortRequestError);
      assert.equal(error.message, 'guest-host port request failed');
    });
  });
});
