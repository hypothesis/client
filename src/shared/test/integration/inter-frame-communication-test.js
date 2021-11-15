import { delay } from '../../../test-util/wait';
import { Bridge as BridgeOri } from '../../bridge';
import { ListenerCollection as ListenerCollectionOri } from '../../listener-collection';
import { PortFinder as PortFinderOri } from '../../port-finder';
import { PortProvider as PortProviderOri } from '../../port-provider';
import { isMessageEqual } from '../../port-util';

describe('PortProvider-PortFinder-Bridge integration', () => {
  let destroyables;

  // These proxy classes are to keep track of instances that need to be destroyed.
  class Bridge extends BridgeOri {
    constructor() {
      super();
      destroyables.push(this);
    }
  }

  class ListenerCollection extends ListenerCollectionOri {
    constructor() {
      super();
      destroyables.push(this);
    }
    destroy() {
      this.removeAll();
    }
  }

  class PortFinder extends PortFinderOri {
    constructor(...args) {
      super(...args);
      destroyables.push(this);
    }
  }

  class PortProvider extends PortProviderOri {
    constructor(...args) {
      super(...args);
      destroyables.push(this);
    }
  }

  beforeEach(() => {
    destroyables = [];
  });

  afterEach(() => {
    destroyables.forEach(instance => instance.destroy());
  });

  it('enables the communication between sidebar-host and notebook-sidebar frames', async () => {
    let done;
    const promise = new Promise(resolve => (done = resolve));

    // Test this fictional message path:
    // host -- ping --> sidebar -- ping --> notebook
    // host <- pong --- sidebar <- pong --- notebook

    // host frame
    const portProvider = new PortProvider(window.location.origin);
    const hostBridge = new Bridge();

    // register RPC method *before* creating the channel
    hostBridge.on('pong', done);
    hostBridge.createChannel(portProvider.sidebarPort);

    // call RPC method *after* creating the channel. These RPC messages are
    // queued and will be eventually be received by the sidebar.
    hostBridge.call('ping');

    portProvider.listen();

    await delay(10); // add some realism

    // sidebar frame
    const portFinder1 = new PortFinder({
      hostFrame: window,
      source: 'sidebar',
    });
    const sidebarBridge1 = new Bridge();
    const sidebarBridge2 = new Bridge();

    // The following promise is to prevent sending a message to the notebook
    // before the notebook-sidebar (sidebarBridge2) channel is created.
    let notebookSidebarEnable;
    const isNotebookSidebarEnable = new Promise(
      resolve => (notebookSidebarEnable = resolve)
    );

    // register RPC method *before* creating the channel.
    sidebarBridge1.on('ping', async () => {
      await isNotebookSidebarEnable;
      sidebarBridge2.call('ping');
    });
    sidebarBridge2.on('pong', () => sidebarBridge1.call('pong'));

    const listenerCollection = new ListenerCollection();
    portFinder1
      .discover('host')
      .then(port => {
        sidebarBridge1.createChannel(port);
        return port;
      })
      .then(port =>
        listenerCollection.add(port, 'message', ({ data, ports }) => {
          if (
            isMessageEqual(data, {
              frame1: 'notebook',
              frame2: 'sidebar',
              type: 'offer',
            })
          ) {
            sidebarBridge2.createChannel(ports[0]);
            notebookSidebarEnable();
          }
        })
      );

    await delay(10); // add some realism

    // notebook frame
    const portFinder2 = new PortFinder({
      hostFrame: window,
      source: 'notebook',
    });
    const notebookBridge = new Bridge();

    // register RPC method *before* creating the channel
    notebookBridge.on('ping', () => notebookBridge.call('pong'));

    portFinder2
      .discover('sidebar')
      .then(port => notebookBridge.createChannel(port));

    return promise;
  });

  it('enables the communication between sidebar-host, guest-sidebar and guest-host frames', async () => {
    let done;
    const promise = new Promise(resolve => (done = resolve));

    // Test this fictional message path:
    // host -- ping --> sidebar -- ping --> guest
    // host <------------ pong ------------ guest

    // host frame
    const portProvider = new PortProvider(window.location.origin);
    const hostBridge1 = new Bridge();
    const hostBridge2 = new Bridge();

    hostBridge1.createChannel(portProvider.sidebarPort);

    // register RPC method *before* creating the channel
    hostBridge2.on('pong', done);
    portProvider.on('hostPortRequest', (_source, port) =>
      hostBridge2.createChannel(port)
    );

    // call RPC method *after* creating the channel. These RPC messages are
    // queued and will be eventually be received by the sidebar.
    hostBridge1.call('ping');

    portProvider.listen();

    await delay(10); // add some realism

    // sidebar frame
    const portFinder1 = new PortFinder({
      hostFrame: window,
      source: 'sidebar',
    });
    const sidebarBridge1 = new Bridge();
    const sidebarBridge2 = new Bridge();

    // The following promise is to prevent sending a message to the guest
    // before the guest-sidebar (sidebarBridge) channel is created.
    let guestSidebarEnable;
    const isGuestSidebarEnable = new Promise(
      resolve => (guestSidebarEnable = resolve)
    );

    // register RPC method *before* creating the channel.
    sidebarBridge1.on('ping', async () => {
      await isGuestSidebarEnable;
      sidebarBridge2.call('ping');
    });

    const listenerCollection = new ListenerCollection();
    portFinder1
      .discover('host')
      .then(port => {
        sidebarBridge1.createChannel(port);
        return port;
      })
      .then(port =>
        listenerCollection.add(port, 'message', ({ data, ports }) => {
          if (
            isMessageEqual(data, {
              frame1: 'guest',
              frame2: 'sidebar',
              type: 'offer',
            })
          ) {
            sidebarBridge2.createChannel(ports[0]);
            guestSidebarEnable();
          }
        })
      );

    await delay(10); // add some realism

    // guest frame
    const portFinder2 = new PortFinder({ hostFrame: window, source: 'guest' });
    const guestBridge1 = new Bridge();
    const guestBridge2 = new Bridge();

    // The following promise is to prevent sending a message to the host
    // before the guest-host (guestBridge2) channel is created.
    let guestHostEnable;
    const isGuestHostEnable = new Promise(
      resolve => (guestHostEnable = resolve)
    );

    // register RPC method *before* creating the channel
    guestBridge1.on('ping', async () => {
      await isGuestHostEnable;
      guestBridge2.call('pong');
    });

    portFinder2
      .discover('sidebar')
      .then(port => guestBridge1.createChannel(port));

    portFinder2
      .discover('host')
      .then(port => guestBridge2.createChannel(port))
      .then(guestHostEnable);

    return promise;
  });
});
