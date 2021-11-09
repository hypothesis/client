/**
 * @typedef Listener
 * @prop {EventTarget} eventTarget
 * @prop {string} eventType
 * @prop {(event: Event) => void} listener
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
   * Adds a listener and returns a listenerId
   *
   * @param {Listener['eventTarget']} eventTarget
   * @param {Listener['eventType']} eventType
   * @param {Listener['listener']} listener
   * @param {AddEventListenerOptions} [options]
   */
  add(eventTarget, eventType, listener, options) {
    eventTarget.addEventListener(eventType, listener, options);
    const symbol = Symbol();
    this._listeners.set(symbol, { eventTarget, eventType, listener });
    return symbol;
  }

  /**
   * Removes a listener using a listenerId
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
