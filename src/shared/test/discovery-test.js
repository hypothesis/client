'use strict';

const Discovery = require('../discovery');

function createWindow() {
  return {
    top: null,
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
    postMessage: sinon.stub(),
    length: 0,
    frames: [],
  };
}

describe('shared/discovery', () => {
  let fakeFrameWindow;
  let fakeTopWindow;

  beforeEach(() => {
    fakeTopWindow = createWindow();
    fakeTopWindow.top = fakeTopWindow;

    fakeFrameWindow = createWindow();
    fakeFrameWindow.top = fakeTopWindow;

    fakeTopWindow.frames = [fakeFrameWindow];
  });

  describe('#startDiscovery', () => {
    it('adds a "message" listener to the window object', () => {
      const discovery = new Discovery(fakeTopWindow);
      discovery.startDiscovery(sinon.stub());
      assert.calledWith(
        fakeTopWindow.addEventListener,
        'message',
        sinon.match.func,
        false
      );
    });
  });

  context('when acting as a server', () => {
    let server;

    beforeEach(() => {
      server = new Discovery(fakeFrameWindow, { server: true });
    });

    it('sends "offer" messages to every frame in the current tab', () => {
      server.startDiscovery(sinon.stub());
      assert.calledWith(
        fakeTopWindow.postMessage,
        '__cross_frame_dhcp_offer',
        '*'
      );
    });

    it('allows the origin to be provided', () => {
      server = new Discovery(fakeFrameWindow, {
        server: true,
        origin: 'https://example.com',
      });
      server.startDiscovery(sinon.stub());
      assert.calledWith(
        fakeTopWindow.postMessage,
        '__cross_frame_dhcp_offer',
        'https://example.com'
      );
    });

    it('does not send "offer" messages to itself', () => {
      server.startDiscovery(sinon.stub());
      assert.notCalled(fakeFrameWindow.postMessage);
    });

    it('sends an "ack" when it receives a "request" message', () => {
      fakeFrameWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_request',
        source: fakeTopWindow,
        origin: 'https://top.com',
      });

      server.startDiscovery(sinon.stub());

      assert.calledWith(
        fakeTopWindow.postMessage,
        sinon.match(/__cross_frame_dhcp_ack:\d+/),
        'https://top.com'
      );
    });

    it('calls the `onDiscovery` callback on receiving a request', () => {
      fakeFrameWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_request',
        source: fakeTopWindow,
        origin: 'https://top.com',
      });
      const onDiscovery = sinon.stub();

      server.startDiscovery(onDiscovery);

      assert.calledWith(
        onDiscovery,
        fakeTopWindow,
        'https://top.com',
        sinon.match(/\d+/)
      );
    });

    it('raises an error if it receives an event from another server', () => {
      fakeFrameWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeTopWindow,
        origin: 'https://top.com',
      });
      const onDiscovery = sinon.stub();
      assert.throws(() => {
        server.startDiscovery(onDiscovery);
      });
    });
  });

  context('when acting as a client', () => {
    let client;

    beforeEach(() => {
      client = new Discovery(fakeTopWindow);
    });

    it('sends out a discovery message to every frame', () => {
      client.startDiscovery(sinon.stub());
      assert.calledWith(
        fakeFrameWindow.postMessage,
        '__cross_frame_dhcp_discovery',
        '*'
      );
    });

    it('does not send the message to itself', () => {
      client.startDiscovery(sinon.stub());
      assert.notCalled(fakeTopWindow.postMessage);
    });

    it('sends a "request" message in response to an "offer" message', () => {
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeFrameWindow,
        origin: 'https://iframe.com',
      });

      client.startDiscovery(sinon.stub());

      assert.calledWith(
        fakeFrameWindow.postMessage,
        '__cross_frame_dhcp_request',
        'https://iframe.com'
      );
    });

    it('does not respond to an "offer" if a "request" is already in progress', () => {
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeFrameWindow,
        origin: 'https://iframe1.com',
      });
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeFrameWindow,
        origin: 'https://iframe2.com',
      });

      client.startDiscovery(sinon.stub());

      // `postMessage` should be called first for discovery, then for offer.
      assert.calledTwice(fakeFrameWindow.postMessage);
      const lastCall = fakeFrameWindow.postMessage.lastCall;
      assert.isTrue(
        lastCall.notCalledWith(sinon.match.string, 'https://iframe2.com')
      );
    });

    it('does respond to an "offer" if a previous "request" has completed', () => {
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeFrameWindow,
        origin: 'https://iframe1.com',
      });
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_ack:1234',
        source: fakeFrameWindow,
        origin: 'https://iframe1.com',
      });
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_offer',
        source: fakeFrameWindow,
        origin: 'https://iframe2.com',
      });

      client.startDiscovery(sinon.stub());

      assert.calledWith(
        fakeFrameWindow.postMessage,
        '__cross_frame_dhcp_request',
        'https://iframe2.com'
      );
    });

    it('calls the `onDiscovery` callback on receiving an "ack"', () => {
      fakeTopWindow.addEventListener.yields({
        data: '__cross_frame_dhcp_ack:1234',
        source: fakeFrameWindow,
        origin: 'https://iframe.com',
      });
      const onDiscovery = sinon.stub();

      client.startDiscovery(onDiscovery);

      assert.calledWith(
        onDiscovery,
        fakeFrameWindow,
        'https://iframe.com',
        '1234'
      );
    });
  });

  describe('#stopDiscovery', () => {
    it('removes the "message" listener from the window', () => {
      const discovery = new Discovery(fakeFrameWindow);

      discovery.startDiscovery(sinon.stub());
      discovery.stopDiscovery();

      const handler = fakeFrameWindow.addEventListener.lastCall.args[1];
      assert.calledWith(
        fakeFrameWindow.removeEventListener,
        'message',
        handler
      );
    });

    it('allows `startDiscovery` to be called with a new handler', () => {
      const discovery = new Discovery(fakeFrameWindow);

      discovery.startDiscovery();
      discovery.stopDiscovery();

      assert.doesNotThrow(() => {
        discovery.startDiscovery();
      });
    });
  });
});
