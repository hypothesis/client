'use strict';

var extend = require('extend');

var RPC = require('./frame-rpc');

// The Bridge service sets up a channel between frames
// and provides an events API on top of it.
class Bridge {
  static initClass() {
    // Connected links to other frames
    this.prototype.links = null;
    this.prototype.channelListeners = null;
    this.prototype.onConnectListeners = null;
  }

  constructor() {
    this.links = [];
    this.channelListeners = {};
    this.onConnectListeners = [];
  }

  // Tear down the bridge. We destroy each RPC "channel" object we know about.
  // This removes the `onmessage` event listeners, thus removing references to
  // any listeners and allowing them to be garbage collected.
  destroy() {
    return Array.from(this.links).map((link) =>
      link.channel.destroy());
  }

  createChannel(source, origin, token) {
    var channel = null;
    var connected = false;

    var ready = () => {
      if (connected) { return; }
      connected = true;
      Array.from(this.onConnectListeners).forEach((cb) =>
        cb.call(null, channel, source)
      );
    };

    var connect = (_token, cb) => {
      if (_token === token) {
        cb();
        ready();
      }
    };

    var listeners = extend({connect}, this.channelListeners);

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

  // Make a method call on all links, collect the results and pass them to a
  // callback when all results are collected. Parameters:
  // - method (required): name of remote method to call
  // - args...: parameters to pass to remote method
  // - callback: (optional) called with error, if any, and an Array of results
  call(method, ...args) {
    var cb;
    if (typeof(args[args.length - 1]) === 'function') {
      cb = args[args.length - 1];
      args = args.slice(0, -1);
    }

    var _makeDestroyFn = c => {
      return error => {
        c.destroy();
        this.links = (Array.from(this.links).filter((l) => l.channel !== c).map((l) => l));
        throw error;
      };
    };

    var promises = this.links.map(function(l) {
      var p = new Promise(function(resolve, reject) {
        var timeout = setTimeout((() => resolve(null)), 1000);
        try {
          return l.channel.call(method, ...Array.from(args), function(err, result) {
            clearTimeout(timeout);
            if (err) { return reject(err); } else { return resolve(result); }
          });
        } catch (error) {
          var err = error;
          return reject(err);
        }
      });

      // Don't assign here. The disconnect is handled asynchronously.
      return p.catch(_makeDestroyFn(l.channel));
    });

    var resultPromise = Promise.all(promises);

    if (cb) {
      resultPromise = resultPromise
        .then(results => cb(null, results))
        .catch(error => cb(error));
    }

    return resultPromise;
  }

  on(method, callback) {
    if (this.channelListeners[method]) {
      throw new Error(`Listener '${method}' already bound in Bridge`);
    }
    this.channelListeners[method] = callback;
    return this;
  }

  off(method) {
    delete this.channelListeners[method];
    return this;
  }

  // Add a function to be called upon a new connection
  onConnect(callback) {
    this.onConnectListeners.push(callback);
    return this;
  }
}
Bridge.initClass();

module.exports = Bridge;
