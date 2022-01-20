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
    const simulateGuest = async () => {
      const portFinder = new PortFinder({
        hostFrame: window,
        source: 'guest',
      });
      const port = await portFinder.discover('host');

      const hostRPC = new PortRPC();
      hostRPC.connect(port);
      await new Promise(resolve =>
        hostRPC.call('ping', response => {
          assert.equal(response, 'pong');
          resolve();
        })
      );
    };

    const simulateHost = async () => {
      await delay(10); // simulate scenario when host frame is ready before the guest frame

      const portProvider = new PortProvider(window.location.origin);
      portProvider.listen();

      const guestRPC = new PortRPC();
      guestRPC.on('ping', cb => cb('pong'));

      portProvider.on('frameConnected', (source, port) => {
        if (source === 'guest') {
          guestRPC.connect(port);
        }
      });
    };

    return Promise.all([simulateGuest(), simulateHost()]);
  });

  it('enables the communication between guest-sidebar', async () => {
    const simulateGuest = async () => {
      const portFinder = new PortFinder({
        hostFrame: window,
        source: 'guest',
      });
      const hostRPC = new PortRPC();

      const port = await portFinder.discover('sidebar');
      hostRPC.connect(port);

      await new Promise(resolve =>
        hostRPC.call('ping', response => {
          assert.equal(response, 'pong');
          resolve();
        })
      );
    };

    const simulateSidebar = async () => {
      const portFinder = new PortFinder({
        hostFrame: window,
        source: 'sidebar',
      });
      const port = await portFinder.discover('host');

      const guestRPC = new PortRPC();
      guestRPC.on('ping', cb => cb('pong'));

      const listenerCollection = new ListenerCollection();
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

      port.start(); // `start` is normally invoked by `hostRPC.connect(port)`
    };

    const simulateHost = async () => {
      await delay(10); // simulate scenario when host frame is ready before the guest frame

      const portProvider = new PortProvider(window.location.origin);
      portProvider.listen();
    };

    return Promise.all([simulateGuest(), simulateSidebar(), simulateHost()]);
  });

  it('enables the communication between sidebar-host', async () => {
    const simulateSidebar = async () => {
      const portFinder = new PortFinder({
        hostFrame: window,
        source: 'sidebar',
      });
      const port = await portFinder.discover('host');

      const hostRPC = new PortRPC();
      hostRPC.connect(port);

      await new Promise(resolve => {
        hostRPC.call('ping', response => {
          assert.equal(response, 'pong');
          resolve();
        });
      });
    };

    const simulateHost = () => {
      const portProvider = new PortProvider(window.location.origin);
      portProvider.listen();

      const sidebarRPC = new PortRPC();
      sidebarRPC.on('ping', cb => cb('pong'));

      portProvider.on('frameConnected', (source, port) => {
        if (source === 'sidebar') {
          sidebarRPC.connect(port);
        }
      });
    };

    return Promise.all([simulateSidebar(), simulateHost()]);
  });
});
