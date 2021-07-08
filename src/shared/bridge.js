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
    /** @type {Array<RPC>} */
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
    this.links.forEach(channel => channel.destroy());
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
   *
   * @deprecated
   */
  createChannel(source, origin, token) {
    if (source instanceof MessagePort) {
      return this.createChannelFromPort(source, 'dummy');
    }

    let channel = null;
    let connected = false;

    const ready = () => {
      if (connected) {
        return;
      }
      connected = true;
      this.onConnectListeners.forEach(cb => cb.call(null, channel, source));
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
    this.links.push(channel);

    return channel;
  }

  /**
   * Create a communication channel using `MessageChannel.MessagePort`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {MessagePort} port - The source port.
   * @param {'host'|'sidebar'|'notebook'|'guest'|'dummy'} destinationFrame - TODO: this is to
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
      this.onConnectListeners.forEach(cb => cb.call(null, channel, port));
    };
    channel.call('connect', ready);

    // Store the newly created channel in our collection
    this.links.push(channel);

    return channel;
  }

  /**
   * Make a method call on all channels, collect the results and pass them to a
   * callback when all results are collected.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args - Arguments to method. Final argument is an optional
   *   callback with this type: `(error: string|Error, ...result: any[]) => void`
   * @return {Promise<any[]>} - Array of results, one per connected frame
   */
  call(method, ...args) {
    let cb;
    const finalArg = args[args.length - 1];
    if (typeof finalArg === 'function') {
      cb = finalArg;
      args = args.slice(0, -1);
    }

    /** @param {RPC} channel */
    const _makeDestroyFn = channel => {
      return error => {
        channel.destroy();
        this.links = this.links.filter(
          registeredChannel => registeredChannel !== channel
        );
        throw error;
      };
    };

    const promises = this.links.map(channel => {
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(null), 1000);
        // This try/catch is only used on tests, to exercise the `_makeDestroyFn`
        // function. In real life, the execution of the channel.call's callback will
        // never throws an exception. The try/catch can be removed when we support
        // `MessageChannel`, because we can exercise `_makeDestroyFn` more easily
        // In addition, the two lines in `_makeDestroyFn` can moved to the if
        // condition below, and remove the `_makeDestroyFn` function altogether.
        try {
          channel.call(method, ...args, (error, result) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

      // Don't assign here. The disconnect is handled asynchronously.
      return promise.catch(_makeDestroyFn(channel));
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
   * @param {(...args: any[]) => void} callback -- Final argument is an optional
   *   callback of the type: `(error: string|Error, ...result: any[]) => void`
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
   * Attention: for this to have the intended effect, it needs to be called
   * before `createChannel`, because at that point the methods are registered
   * with the `RPC` class and there is no way to remove the listeners.
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
