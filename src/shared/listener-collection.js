/**
 * @typedef Listener
 * @prop {EventTarget} eventTarget
 * @prop {string} eventType
 * @prop {(event: Event) => void} listener
 */

/**
 * Return the event type that a listener will receive.
 *
 * For example `EventType<HTMLElement, 'keydown'>` evaluates to `KeyboardEvent`.
 *
 * The event type is extracted from the target's `on${Type}` property (eg.
 * `HTMLElement.onkeydown` here) If there is no such property, the type defaults
 * to `Event`.
 *
 * @template {EventTarget} Target
 * @template {string} Type
 * @typedef {`on${Type}` extends keyof Target ?
 *   Target[`on${Type}`] extends ((...args: any[]) => void)|null ?
 *     Parameters<NonNullable<Target[`on${Type}`]>>[0]
 *  : Event : Event} EventType
 */

/**
 * Utility that provides a way to conveniently remove a set of DOM event
 * listeners when they are no longer needed.
 */
export class ListenerCollection {
  constructor() {
    /** @type {Map<Symbol, Listener>} */
    this._listeners = new Map();
  }

  /**
   * Add a listener and return an ID that can be used to remove it later
   *
   * @template {string} Type
   * @template {EventTarget} Target
   * @param {Target} eventTarget
   * @param {Type} eventType
   * @param {(event: EventType<Target, Type>) => void} listener
   * @param {AddEventListenerOptions} [options]
   */
  add(eventTarget, eventType, listener, options) {
    eventTarget.addEventListener(
      eventType,
      /** @type {EventListener} */ (listener),
      options
    );
    const symbol = Symbol();
    this._listeners.set(symbol, {
      eventTarget,
      eventType,
      // eslint-disable-next-line object-shorthand
      listener: /** @type {EventListener} */ (listener),
    });
    return symbol;
  }

  /**
   * Remove a specific listener.
   *
   * @param {Symbol} listenerId
   */
  remove(listenerId) {
    const event = this._listeners.get(listenerId);
    if (event) {
      const { eventTarget, eventType, listener } = event;
      eventTarget.removeEventListener(eventType, listener);
      this._listeners.delete(listenerId);
    }
  }

  removeAll() {
    this._listeners.forEach(({ eventTarget, eventType, listener }) => {
      eventTarget.removeEventListener(eventType, listener);
    });
    this._listeners.clear();
  }
}
