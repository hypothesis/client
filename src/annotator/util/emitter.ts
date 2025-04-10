/*
 * Disable @typescript-eslint/ban-types for the whole file, as changing the
 * event's callback type away from `Function` has multiple implications that
 * should be addressed separately
 */
import { EventEmitter } from '../../shared/event-emitter';
import type { EventMap } from '../../shared/event-emitter';
import type { Destroyable } from '../../types/annotator';

type Callback = (...args: any[]) => void;

/**
 * Emitter is a communication class that implements the publisher/subscriber
 * pattern. It allows sending and listening events through a shared EventBus.
 * The different elements of the application can communicate with each other
 * without being tightly coupled.
 */
export class Emitter<Event extends EventMap> implements Destroyable {
  private _emitter: EventEmitter<Event>;
  private _subscriptions: [event: string, callback: Callback][];

  constructor(emitter: EventEmitter<Event>) {
    this._emitter = emitter;
    this._subscriptions = [];
  }

  /**
   * Fire an event.
   */
  publish<K extends keyof Event>(event: K, ...args: Parameters<Event[K]>) {
    this._emitter.emit(event, ...args);
  }

  /**
   * Register an event listener.
   */
  subscribe<K extends keyof Event>(event: K, callback: Event[K]) {
    this._emitter.on(event, callback);
    this._subscriptions.push([event as string, callback]);
  }

  /**
   * Remove an event listener.
   */
  unsubscribe<K extends keyof Event>(event: K, callback: Callback) {
    this._emitter.off(event, callback as Event[K]);
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
      this._emitter.off(event, callback as any);
    }
    this._subscriptions = [];
  }
}

export class EventBus<Event extends EventMap> {
  private _emitter: EventEmitter<Event>;

  constructor() {
    this._emitter = new EventEmitter();
  }

  createEmitter() {
    return new Emitter(this._emitter);
  }
}
