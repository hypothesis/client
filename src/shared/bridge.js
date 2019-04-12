'use strict';

const extend = require('extend');

const RPC = require('./frame-rpc');

/**
 * The Bridge service sets up a channel between frames and provides an events
 * API on top of it.
 */
class Bridge {
  constructor() {
    this.links = [];
    this.channelListeners = {};
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
   * @param {Window} source - The source window.
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

    const listeners = extend({ connect }, this.channelListeners);

    // Set up a channel
    channel = new RPC(window, source, origin, listeners);

    // Fire off a connection attempt
    channel.call('connect', token, ready);

    // Store the newly created channel in our collection
    this.links.push({
      channel,
      window: source,
    });

    return channel;
  }

  /**
   * Make a method call on all channels, collect the results and pass them to a
   * callback when all results are collected.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args - Arguments to method.
   * @param [Function] callback - Called with an array of results.
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

    const promises = this.links.map(function(l) {
      const p = new Promise(function(resolve, reject) {
        const timeout = setTimeout(() => resolve(null), 1000);
        try {
          return l.channel.call(method, ...Array.from(args), function(
            err,
            result
          ) {
            clearTimeout(timeout);
            if (err) {
              return reject(err);
            } else {
              return resolve(result);
            }
          });
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
   * @param {Function} callback
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
   * @param {Function} callback
   */
  onConnect(callback) {
    this.onConnectListeners.push(callback);
    return this;
  }
}

module.exports = Bridge;
