export type EventMap = Record<string, (...args: any) => void>;

/**
 * A simple event emitter with an API similar to Node's `EventEmitter`.
 *
 * `Event` is an object type that maps event names to the function signatures of
 * subscribers for those events. For example, this defines an emitter which
 * emits one event, `uriChanged`, with a single string argument:
 *
 * ```
 * type Events = {
 *   uriChanged(uri: string): void;
 * }
 * ```
 */
export class EventEmitter<Event extends EventMap> {
  // Use a private field here to avoid conflicts with subclasses.
  #listeners: Array<{ name: keyof Event; callback: (...args: any) => void }> =
    [];

  /** Remove all event listeners. */
  destroy() {
    this.#listeners = [];
  }

  /** Add an event handler. */
  on<K extends keyof Event>(name: K, callback: Event[K]) {
    this.#listeners.push({ name, callback });
  }

  /** Remove an event handler. */
  off<K extends keyof Event>(name: K, callback: Event[K]) {
    this.#listeners = this.#listeners.filter(
      ln => !(ln.name === name && ln.callback === callback),
    );
  }

  /** Emit an event. */
  emit<K extends keyof Event>(name: K, ...args: Parameters<Event[K]>) {
    for (const listener of this.#listeners) {
      if (listener.name !== name) {
        continue;
      }
      // Ensure callback is invoked without `this`.
      const callback = listener.callback;
      callback(...args);
    }
  }
}
