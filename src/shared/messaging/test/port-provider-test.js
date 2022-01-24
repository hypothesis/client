import { delay } from '../../../test-util/wait';
import { PortProvider, $imports } from '../port-provider';

describe('PortProvider', () => {
  let portProvider;

  async function sendPortFinderRequest({
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
    await delay(0);

    return event;
  }

  beforeEach(() => {
    sinon.stub(window, 'postMessage');
    portProvider = new PortProvider(window.location.origin);
  });

  afterEach(() => {
    window.postMessage.restore();
    portProvider.destroy();
    $imports.$restore();
  });

  describe('#destroy', () => {
    it('ignores valid port request if `PortFinder` has been destroyed', async () => {
      portProvider.destroy();
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
      });

      assert.notCalled(window.postMessage);
    });
  });

  describe('reporting message errors', () => {
    let fakeSendError;

    beforeEach(() => {
      fakeSendError = sinon.stub();

      $imports.$mock({
        '../frame-error-capture': { sendError: fakeSendError },
      });
    });

    it('reports errors validating messages', async () => {
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'invalid',
          type: 'request',
          requestId: 'abcdef',
        },
      });
      assert.called(fakeSendError);
    });

    it('only reports errors once', async () => {
      const request = {
        data: {
          frame1: 'sidebar',
          frame2: 'invalid',
          type: 'request',
          requestId: 'abcdef',
        },
      };
      await sendPortFinderRequest(request);
      await sendPortFinderRequest(request);

      assert.calledOnce(fakeSendError);
    });
  });

  describe('listens for port requests', () => {
    [
      {
        data: {},
        reason: 'is not a valid message',
      },
      {
        data: {
          frame1: 'dummy', // invalid source
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
        reason: 'contains an invalid frame1',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'dummy', // invalid target
          type: 'request',
          requestId: 'abcdef',
        },
        reason: 'contains an invalid frame2',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'dummy', // invalid type
          requestId: 'abcdef',
        },
        reason: 'contains an invalid type',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
        source: null,
        reason: 'comes from invalid source',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
        origin: 'https://dummy.com',
        reason: 'comes from invalid origin',
      },
    ].forEach(({ data, reason, origin, source }) => {
      it(`ignores port request if message ${reason}`, async () => {
        await sendPortFinderRequest({
          data,
          origin,
          source,
        });

        assert.notCalled(window.postMessage);
      });
    });

    it('responds to a valid port request', async () => {
      const data = {
        frame1: 'sidebar',
        frame2: 'host',
        type: 'request',
        requestId: 'abcdef',
      };

      await sendPortFinderRequest({
        data,
      });

      assert.calledWith(
        window.postMessage,
        { ...data, type: 'offer' },
        window.location.origin,
        [sinon.match.instanceOf(MessagePort)]
      );
    });

    it('responds to a valid port request from a source with an opaque origin', async () => {
      const data = {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
        requestId: 'abcdef',
      };

      await sendPortFinderRequest({ data, origin: 'null' });

      assert.calledWith(window.postMessage, { ...data, type: 'offer' }, '*', [
        sinon.match.instanceOf(MessagePort),
      ]);
    });

    it('responds to the first valid port request but ignores additional requests', async () => {
      const data = {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
        requestId: 'abcdef',
      };

      for (let i = 0; i < 4; ++i) {
        await sendPortFinderRequest({
          data,
        });
      }

      assert.calledOnceWithExactly(
        window.postMessage,
        { ...data, type: 'offer' },
        window.location.origin,
        [sinon.match.instanceOf(MessagePort)]
      );
    });

    it('sends the counterpart port via the sidebar port', async () => {
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
      });

      const [sidebarPort] = window.postMessage.getCall(0).args[2];
      const handler = sinon.stub();
      sidebarPort.onmessage = handler;

      const data = {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
        requestId: 'ghijkl',
      };
      await sendPortFinderRequest({
        data,
      });

      assert.calledWith(
        handler,
        sinon.match({
          data: { ...data, type: 'offer' },
        })
      );
    });

    it('sends the counterpart port via the listener', async () => {
      const handler = sinon.stub();
      portProvider.on('frameConnected', handler);
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
          requestId: 'abcdef',
        },
      });

      assert.calledWith(
        handler,
        'sidebar',
        sinon.match.instanceOf(MessagePort)
      );

      handler.resetHistory();
      await sendPortFinderRequest({
        data: {
          frame1: 'guest',
          frame2: 'host',
          type: 'request',
          requestId: 'ghijkl',
        },
      });

      assert.calledWith(handler, 'guest', sinon.match.instanceOf(MessagePort));
    });
  });
});
