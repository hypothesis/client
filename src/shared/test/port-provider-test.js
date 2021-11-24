import { delay } from '../../test-util/wait';
import { PortProvider } from '../port-provider';

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
  });

  describe('#destroy', () => {
    it('ignores valid port request if `PortFinder` has been destroyed', async () => {
      portProvider.destroy();
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
        },
      });

      assert.notCalled(window.postMessage);
    });
  });

  describe('#listen', () => {
    it('ignores all port requests before `listen` is called', async () => {
      portProvider.listen();
      portProvider.destroy();
      portProvider = new PortProvider(window.location.origin);
      const data = {
        frame1: 'sidebar',
        frame2: 'host',
        type: 'request',
      };
      await sendPortFinderRequest({
        data,
      });

      assert.notCalled(window.postMessage);

      portProvider.listen();
      await sendPortFinderRequest({
        data,
      });

      assert.calledOnce(window.postMessage);
    });
  });

  describe('listens for port requests', () => {
    [
      {
        data: {
          frame1: 'dummy', // invalid source
          frame2: 'host',
          type: 'request',
        },
        reason: 'contains an invalid frame1',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'dummy', // invalid target
          type: 'request',
        },
        reason: 'contains an invalid frame2',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'dummy', // invalid type
        },
        reason: 'contains an invalid type',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
        },
        source: null,
        reason: 'comes from invalid source',
      },
      {
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
        },
        origin: 'https://dummy.com',
        reason: 'comes from invalid origin',
      },
    ].forEach(({ data, reason, origin, source }) => {
      it(`ignores port request if message ${reason}`, async () => {
        portProvider.listen();
        await sendPortFinderRequest({
          data,
          origin,
          source,
        });

        assert.notCalled(window.postMessage);
      });
    });

    it('responds to a valid port request', async () => {
      portProvider.listen();
      const data = {
        frame1: 'sidebar',
        frame2: 'host',
        type: 'request',
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

    it('responds to the first valid port request but ignores additional requests', async () => {
      portProvider.listen();
      const data = {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
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
      portProvider.listen();
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
        },
      });

      const [sidebarPort] = window.postMessage.getCall(0).args[2];
      const handler = sinon.stub();
      sidebarPort.onmessage = handler;

      const data = {
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
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
      portProvider.listen();
      const handler = sinon.stub();
      portProvider.on('frameConnected', handler);
      await sendPortFinderRequest({
        data: {
          frame1: 'sidebar',
          frame2: 'host',
          type: 'request',
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
        },
      });

      assert.calledWith(handler, 'guest', sinon.match.instanceOf(MessagePort));
    });
  });
});
