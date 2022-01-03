import { delay } from '../../../test-util/wait';
import { PortRPC as PortRPC_ } from '../../port-rpc';
import { ListenerCollection as ListenerCollection_ } from '../../listener-collection';
import { PortFinder as PortFinder_ } from '../../port-finder';
import { PortProvider as PortProvider_ } from '../../port-provider';
import { isMessageEqual } from '../../port-util';

describe('PortProvider-PortFinder-PortRPC integration', () => {
  let destroyables;

  // These proxy classes are to keep track of instances that need to be destroyed.
  class PortRPC extends PortRPC_ {
    constructor() {
      super();
      destroyables.push(this);
    }
  }

  class ListenerCollection extends ListenerCollection_ {
    constructor() {
      super();
      destroyables.push(this);
    }
    destroy() {
      this.removeAll();
    }
  }

  class PortFinder extends PortFinder_ {
    constructor(...args) {
      super(...args);
      destroyables.push(this);
    }
  }

  class PortProvider extends PortProvider_ {
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

  it('enables the communication between guest-host', async () => {
    let done;
    const promise = new Promise(resolve => (done = resolve));

    // guest frame
    const portFinder = new PortFinder({
      hostFrame: window,
      source: 'guest',
    });
    const hostRPC = new PortRPC();

    portFinder.discover('host').then(port => {
      hostRPC.connect(port);
      hostRPC.call('ping', response => {
        assert.equal(response, 'pong');
        done();
      });
    });

    await delay(10); // add some realism

    // host frame
    const portProvider = new PortProvider(window.location.origin);
    portProvider.listen();
    const guestRPC = new PortRPC();

    // Register RPC method *before* connection
    guestRPC.on('ping', cb => cb('pong'));

    portProvider.on('frameConnected', (source, port) => {
      if (source === 'guest') {
        guestRPC.connect(port);
      }
    });

    return promise;
  });

  it('enables the communication between guest-sidebar', async () => {
    let done;
    const promise = new Promise(resolve => (done = resolve));

    // guest frame;
    const portFinder1 = new PortFinder({
      hostFrame: window,
      source: 'guest',
    });
    const sidebarRPC = new PortRPC();

    portFinder1.discover('sidebar').then(port => {
      sidebarRPC.connect(port);
      sidebarRPC.call('ping', response => {
        assert.equal(response, 'pong');
        done();
      });
    });

    await delay(10); // add some realism

    // sidebar frame
    const portFinder2 = new PortFinder({
      hostFrame: window,
      source: 'sidebar',
    });
    const guestRPC = new PortRPC();

    // Register RPC method *before* connection
    guestRPC.on('ping', cb => cb('pong'));

    const listenerCollection = new ListenerCollection();
    portFinder2.discover('host').then(port => {
      listenerCollection.add(port, 'message', ({ data, ports }) => {
        if (
          isMessageEqual(data, {
            frame1: 'guest',
            frame2: 'sidebar',
            type: 'offer',
          })
        ) {
          guestRPC.connect(ports[0]);
        }
      });
      port.start(); // `start` method would be triggered by `hostRPC.connect(port)`
    });

    // host frame
    const portProvider = new PortProvider(window.location.origin);
    portProvider.listen();

    return promise;
  });

  it('enables the communication between sidebar-host', async () => {
    let done;
    const promise = new Promise(resolve => (done = resolve));

    // sidebar frame
    const portFinder = new PortFinder({
      hostFrame: window,
      source: 'sidebar',
    });
    const hostRPC = new PortRPC();

    portFinder.discover('host').then(port => {
      hostRPC.connect(port);
      hostRPC.call('ping', response => {
        assert.equal(response, 'pong');
        done();
      });
    });

    // host frame
    const portProvider = new PortProvider(window.location.origin);
    portProvider.listen();
    const sidebarRPC = new PortRPC();

    // Register RPC method *before* connection
    sidebarRPC.on('ping', cb => cb('pong'));

    portProvider.on('frameConnected', (source, port) => {
      if (source === 'sidebar') {
        sidebarRPC.connect(port);
      }
    });

    return promise;
  });
});
