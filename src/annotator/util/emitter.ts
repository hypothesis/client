/* eslint-disable @typescript-eslint/ban-types */

/*
 * Disable @typescript-eslint/ban-types for the whole file, as changing the
 * event's callback type away from `Function` has multiple implications that
 * should be addressed separately
 */
import { TinyEmitter } from 'tiny-emitter';

import type { Destroyable } from '../../types/annotator';

/**
 * Emitter is a communication class that implements the publisher/subscriber
 * pattern. It allows sending and listening events through a shared EventBus.
 * The different elements of the application can communicate with each other
 * without being tightly coupled.
 */
export class Emitter implements Destroyable {
  private _emitter: TinyEmitter;
  private _subscriptions: [event: string, callback: Function][];

  constructor(emitter: TinyEmitter) {
    this._emitter = emitter;
    this._subscriptions = [];
  }

  /**
   * Fire an event.
   */
  publish(event: string, ...args: unknown[]) {
    this._emitter.emit(event, ...args);
  }

  /**
   * Register an event listener.
   */
  subscribe(event: string, callback: Function) {
    this._emitter.on(event, callback);
    this._subscriptions.push([event, callback]);
  }

  /**
   * Remove an event listener.
   */
  unsubscribe(event: string, callback: Function) {
    this._emitter.off(event, callback);
    this._subscriptions = this._subscriptions.filter(
      ([subEvent, subCallback]) =>
        subEvent !== event || subCallback !== callback,
    );
  }

  /**
   * Remove all event listeners.
   */
  destroy() {
    for (const [event, callback] of this._subscriptions) {
      this._emitter.off(event, callback);
    }
    this._subscriptions = [];
  }
}

export class EventBus {
  private _emitter: TinyEmitter;

  constructor() {
    this._emitter = new TinyEmitter();
  }

  createEmitter() {
    return new Emitter(this._emitter);
  }
}
