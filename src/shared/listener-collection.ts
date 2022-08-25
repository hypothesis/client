type Listener = {
  eventTarget: EventTarget;
  eventType: string;
  listener: (event: Event) => void;
};

/**
 * Return the event type that a listener will receive.
 *
 * For example `EventType<HTMLElement, 'keydown'>` evaluates to `KeyboardEvent`.
 *
 * The event type is extracted from the target's `on${Type}` property (eg.
 * `HTMLElement.onkeydown` here) If there is no such property, the type defaults
 * to `Event`.
 */
type EventType<
  Target extends EventTarget,
  Type extends string
> = `on${Type}` extends keyof Target
  ? Target[`on${Type}`] extends ((...args: any[]) => void) | null
    ? Parameters<NonNullable<Target[`on${Type}`]>>[0]
    : Event
  : Event;

/**
 * Utility that provides a way to conveniently remove a set of DOM event
 * listeners when they are no longer needed.
 */
export class ListenerCollection {
  private _listeners: Map<symbol, Listener>;

  constructor() {
    this._listeners = new Map();
  }

  /**
   * Add a listener and return an ID that can be used to remove it later
   */
  add<Type extends string, Target extends EventTarget>(
    eventTarget: Target,
    eventType: Type,
    listener: (event: EventType<Target, Type>) => void,
    options?: AddEventListenerOptions
  ) {
    eventTarget.addEventListener(eventType, listener as EventListener, options);
    const symbol = Symbol();
    this._listeners.set(symbol, {
      eventTarget,
      eventType,
      // eslint-disable-next-line object-shorthand
      listener: listener as EventListener,
    });
    return symbol;
  }

  /**
   * Remove a specific listener.
   */
  remove(listenerId: symbol) {
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
