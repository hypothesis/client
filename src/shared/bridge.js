import { RPC } from './frame-rpc';

/** @typedef {import('../types/annotator').Destroyable} Destroyable */

/**
 * The Bridge service sets up a channel between frames and provides an events
 * API on top of it.
 *
 * @implements Destroyable
 */
export default class Bridge {
  constructor() {
    /** @type {Array<{channel: RPC, windowOrPort: Window|MessagePort}>} */
    this.links = [];
    /** @type {Record<string, (...args: any[]) => void>} */
    this.channelListeners = {};
    /** @type {Array<(...args: any[]) => void>} */
    this.onConnectListeners = [];
  }

  /**
   * Destroy all channels created with `createChannel`.
   *
   * This removes the event listeners for messages arriving from other windows.
   */
  destroy() {
    Array.from(this.links).map(link => link.channel.destroy());
  }

  /**
   * Create a communication channel between this window and `source`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {Window|MessagePort} source - The message source.
   * @param {string} origin - The origin of the document in `source`.
   * @param {string} token
   * @return {RPC} - Channel for communicating with the window.
   */
  createChannel(source, origin, token) {
    let channel = null;
    let connected = false;

    const ready = () => {
      if (connected) {
        return;
      }
      connected = true;
      Array.from(this.onConnectListeners).forEach(cb =>
        cb.call(null, channel, source)
      );
    };

    const connect = (_token, cb) => {
      if (_token === token) {
        cb();
        ready();
      }
    };

    const listeners = { connect, ...this.channelListeners };

    // Set up a channel
    channel = new RPC(window, source, origin, listeners);

    // Fire off a connection attempt
    channel.call('connect', token, ready);

    // Store the newly created channel in our collection
    this.links.push({
      channel,
      windowOrPort: source, // TODO: unused, candidate to be removed
    });

    return channel;
  }

  /**
   * Create a communication channel using `MessageChannel.MessagePort`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {MessagePort} port - The source port.
   * @param {'host'|'sidebar'|'notebook'|'guest'} destinationFrame - TODO: this is to
   * allow, in the future, to communicate with specific frames
   * `bridge.call(..., {targetFrames: ['sidebar'|'notebook'|'host'|'guest']})`
   * @return {RPC} - Channel for communicating with the port.
   */
  // eslint-disable-next-line no-unused-vars
  createChannelFromPort(port, destinationFrame) {
    const listeners = { ...this.channelListeners, connect: cb => cb() };

    // Set up a channel
    const channel = new RPC(
      window /* dummy */,
      port,
      '*' /* dummy */,
      listeners
    );

    // Fire off a connection attempt
    const ready = () => {
      Array.from(this.onConnectListeners).forEach(cb =>
        cb.call(null, channel, port)
      );
    };
    channel.call('connect', ready);

    // Store the newly created channel in our collection
    this.links.push({
      channel,
      windowOrPort: port, // TODO: unused, candidate to be removed
    });

    return channel;
  }

  /**
   * Make a method call on all channels, collect the results and pass them to a
   * callback when all results are collected.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args - Arguments to method.
   * @return {Promise<any[]>} - Array of results, one per connected frame
   */
  call(method, ...args) {
    let cb;
    if (typeof args[args.length - 1] === 'function') {
      cb = args[args.length - 1];
      args = args.slice(0, -1);
    }

    const _makeDestroyFn = c => {
      return error => {
        c.destroy();
        this.links = Array.from(this.links)
          .filter(l => l.channel !== c)
          .map(l => l);
        throw error;
      };
    };

    const promises = this.links.map(function (l) {
      const p = new Promise(function (resolve, reject) {
        const timeout = setTimeout(() => resolve(null), 1000);
        try {
          return l.channel.call(
            method,
            ...Array.from(args),
            function (err, result) {
              clearTimeout(timeout);
              if (err) {
                return reject(err);
              } else {
                return resolve(result);
              }
            }
          );
        } catch (error) {
          const err = error;
          return reject(err);
        }
      });

      // Don't assign here. The disconnect is handled asynchronously.
      return p.catch(_makeDestroyFn(l.channel));
    });

    let resultPromise = Promise.all(promises);

    if (cb) {
      resultPromise = resultPromise
        .then(results => cb(null, results))
        .catch(error => cb(error));
    }

    return resultPromise;
  }

  /**
   * Register a callback to be invoked when any connected channel sends a
   * message to this `Bridge`.
   *
   * @param {string} method
   * @param {(...args: any[]) => void} callback
   */
  on(method, callback) {
    if (this.channelListeners[method]) {
      throw new Error(`Listener '${method}' already bound in Bridge`);
    }
    this.channelListeners[method] = callback;
    return this;
  }

  /**
   * Unregister any callbacks registered with `on`.
   *
   * @param {string} method
   */
  off(method) {
    delete this.channelListeners[method];
    return this;
  }

  /**
   * Add a function to be called upon a new connection.
   *
   * @param {(...args: any[]) => void} callback
   */
  onConnect(callback) {
    this.onConnectListeners.push(callback);
    return this;
  }
}
