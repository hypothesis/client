import $ from 'jquery';

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
    // Some subclasses rely on a legacy mechanism of defining options at
    // the class level by defining an `options` property on the prototype.
    const classOptions = this.options || {};
    this.options = { ...classOptions, ...config };
    this.element = $(element);

    this.on = this.subscribe;
  }

  /**
   * Clean up event listeners and other resources.
   *
   * Sub-classes should override this to clean up their resources and then call
   * the base implementation.
   */
  destroy() {
    // FIXME - This should unbind any event handlers registered via `subscribe`.
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
  publish(event, args) {
    this.element.triggerHandler(event, args);
  }

  /**
   * Register an event handler.
   *
   * @param {string} event
   * @param {Function} callback
   */
  subscribe(event, callback) {
    // Wrapper that strips the `event` argument.
    const closure = (event, ...args) => callback(...args);

    // Ensure both functions have the same unique id so that jQuery will accept
    // callback when unbinding closure.
    //
    // @ts-expect-error - `guid` property is non-standard
    closure.guid = callback.guid = $.guid += 1;

    // Ignore false positive lint warning about function bind.
    // eslint-disable-next-line
    this.element.bind(event, closure);
  }

  /**
   * Remove an event handler.
   *
   * @param {string} event
   * @param {Function} callback
   */
  unsubscribe(event, callback) {
    this.element.unbind(event, callback);
  }
}
