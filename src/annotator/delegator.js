import { TinyEmitter as EventEmitter } from 'tiny-emitter';

// Adapted from:
//  https://github.com/openannotation/annotator/blob/v1.2.x/src/class.coffee
//
//  Annotator v1.2.10
//  https://github.com/openannotation/annotator
//
//  Copyright 2015, the Annotator project contributors.
//  Dual licensed under the MIT and GPLv3 licenses.
//  https://github.com/openannotation/annotator/blob/master/LICENSE

/**
 * `Delegator` is a base class for many objects in the annotator.
 *
 * It provides:
 *
 *  - An event bus, attached to the DOM element passed to the constructor.
 *    When an event is published, all `Delegator` instances that share the same
 *    root element will be able to receive the event.
 *  - Configuration storage (via `this.options`)
 *  - A mechanism to clean up event listeners and other resources added to
 *    the page by implementing a `destroy` method, which will be called when
 *    the annotator is removed from the page.
 */
export default class Delegator {
  /**
   * Construct the `Delegator` instance.
   *
   * @param {HTMLElement} element
   * @param {Object} [config]
   */
  constructor(element, config) {
    this.options = { ...config };
    this.element = element;

    const el = /** @type {any} */ (element);

    /** @type {EventEmitter} */
    let eventBus = el._hypothesisEventBus;
    if (!eventBus) {
      eventBus = new EventEmitter();
      el._hypothesisEventBus = eventBus;
    }

    this._eventBus = eventBus;

    /** @type {[event: string, callback: Function][]} */
    this._subscriptions = [];
  }

  /**
   * Clean up event listeners and other resources.
   *
   * Sub-classes should override this to clean up their resources and then call
   * the base implementation.
   */
  destroy() {
    for (let [event, callback] of this._subscriptions) {
      this._eventBus.off(event, callback);
    }
  }

  /**
   * Fire an event.
   *
   * This and other `Delegator` instances which share the same root element will
   * be able to observe it.
   *
   * @param {string} event
   * @param {any[]} [args]
   */
  publish(event, args = []) {
    this._eventBus.emit(event, ...args);
  }

  /**
   * Register an event handler.
   *
   * @param {string} event
   * @param {Function} callback
   */
  subscribe(event, callback) {
    this._eventBus.on(event, callback);
    this._subscriptions.push([event, callback]);
  }

  /**
   * Remove an event handler.
   *
   * @param {string} event
   * @param {Function} callback
   */
  unsubscribe(event, callback) {
    this._eventBus.off(event, callback);
    this._subscriptions = this._subscriptions.filter(
      ([subEvent, subCallback]) =>
        subEvent !== event || subCallback !== callback
    );
  }
}
