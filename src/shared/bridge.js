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
    /** @type {RPC[]} */
    this.links = [];
    /** @type {Record<string, (...args: any[]) => void>} */
    this.channelListeners = {};
    /** @type {Array<(channel: RPC) => void>} */
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
   * Deprecated - Remove after MessagePort conversion
   *
   * @typedef WindowOptions
   * @prop {Window} source - The source window
   * @prop {string} origin - The origin of the document in `source`
   * @prop {string} token - Shared token between the `source` and this window
   *   agreed during the discovery process
   */

  /**
   * Create a communication channel between frames using either `MessagePort` or
   * `Window`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {WindowOptions|MessagePort} options
   * @return {RPC} - Channel for communicating with the window.
   */
  createChannel(options) {
    if (options instanceof MessagePort) {
      return this._createChannelForPort(options);
    } else {
      // Deprecated - Remove after MessagePort conversion
      return this._createChannelForWindow(options);
    }
  }

  /**
   * Create a communication channel using a `MessagePort`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {MessagePort} port
   * @return {RPC} - Channel for communicating with the window.
   */
  _createChannelForPort(port) {
    const listeners = { connect: cb => cb(), ...this.channelListeners };

    // Set up a channel
    const channel = new RPC(
      window /* dummy */,
      port,
      '*' /* dummy */,
      listeners
    );

    let connected = false;
    const ready = () => {
      if (connected) {
        return;
      }
      connected = true;
      this.onConnectListeners.forEach(cb => cb(channel));
    };

    // Fire off a connection attempt
    channel.call('connect', ready);

    // Store the newly created channel in our collection
    this.links.push(channel);

    return channel;
  }

  /**
   * Create a communication channel between this window and `source`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {WindowOptions} options
   * @return {RPC} - Channel for communicating with the window.
   * @deprecated
   */
  _createChannelForWindow({ source, origin, token }) {
    let channel = null;
    let connected = false;

    const ready = () => {
      if (connected) {
        return;
      }
      connected = true;
      this.onConnectListeners.forEach(cb => cb(channel));
    };

    const connect = (_token, cb) => {
      if (_token === token) {
        cb();
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
   * Make a method call on all channels, collect the results and pass them to a
   * callback when all results are collected.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args - Arguments to method. Final argument is an optional
   *   callback with this type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback, if any, will be triggered once a response (via `postMessage`)
   *   comes back from the other frame/s. If the first argument (error) is `null`
   *   it means successful execution of the whole remote procedure call.
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
        try {
          channel.call(method, ...args, (err, result) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        } catch (error) {
          reject(error);
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
   * Register a listener to be invoked when any connected channel sends a
   * message to this `Bridge`.
   *
   * @param {string} method
   * @param {(...args: any[]) => void} listener -- Final argument is an optional
   *   callback of the type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback must be invoked in order to respond (via `postMessage`)
   *   to the other frame/s with a result or an error.
   * @throws {Error} If trying to register a callback after a channel has already been created
   * @throws {Error} If trying to register a callback with the same name multiple times
   */
  on(method, listener) {
    if (this.links.length > 0) {
      throw new Error(
        `Listener '${method}' can't be registered because a channel has already been created`
      );
    }
    if (this.channelListeners[method]) {
      throw new Error(`Listener '${method}' already bound in Bridge`);
    }
    this.channelListeners[method] = listener;
    return this;
  }

  /**
   * Add a listener to be called upon a new connection.
   *
   * @param {(channel: RPC) => void} listener
   */
  onConnect(listener) {
    this.onConnectListeners.push(listener);
    return this;
  }
}
