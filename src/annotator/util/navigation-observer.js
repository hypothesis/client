import { ListenerCollection } from '../../shared/listener-collection';

/**
 * Monkey-patch an object to observe calls to a method.
 *
 * The observer is not notified if the method throws.
 *
 * @template {any} T
 * @param {T} object
 * @param {keyof T} method
 * @param {(...args: unknown[]) => void} handler - Handler that is invoked
 *   after the monitored method has been called.
 * @return {() => void} Callback that removes the observer and restores `object[method]`.
 */
function observeCalls(object, method, handler) {
  const origHandler = object[method];

  /* istanbul ignore next */
  if (typeof origHandler !== 'function') {
    throw new Error('Can only intercept functions');
  }

  // @ts-expect-error
  object[method] = (...args) => {
    const result = origHandler.call(object, ...args);
    handler(...args);
    return result;
  };

  return () => {
    object[method] = origHandler;
  };
}

/** @param {string} url */
function stripFragment(url) {
  return url.replace(/#.*/, '');
}

/**
 * Utility for detecting client-side navigations of an HTML document.
 *
 * This uses the Navigation API [1] if available, or falls back to
 * monkey-patching the History API [2] otherwise.
 *
 * Only navigations which change the path or query params are reported. URL
 * updates which change only the hash fragment are assumed to be navigations to
 * different parts of the same logical document. Also Hypothesis in general
 * ignores the hash fragment when comparing URLs.
 *
 * [1] https://wicg.github.io/navigation-api/
 * [2] https://developer.mozilla.org/en-US/docs/Web/API/History
 */
export class NavigationObserver {
  /**
   * Begin observing navigation changes.
   *
   * @param {(url: string) => void} onNavigate - Callback invoked when a navigation
   *   occurs. The callback is fired after the navigation has completed and the
   *   new URL is reflected in `location.href`.
   * @param {() => string} getLocation - Test seam that returns the current URL
   */
  constructor(
    onNavigate,
    /* istanbul ignore next - default overridden in tests */
    getLocation = () => location.href
  ) {
    this._listeners = new ListenerCollection();

    let lastURL = getLocation();
    const checkForURLChange = (newURL = getLocation()) => {
      if (stripFragment(lastURL) !== stripFragment(newURL)) {
        lastURL = newURL;
        onNavigate(newURL);
      }
    };

    // @ts-expect-error - TS is missing Navigation API types.
    const navigation = window.navigation;
    if (navigation) {
      this._listeners.add(navigation, 'navigatesuccess', () =>
        checkForURLChange()
      );
    } else {
      const unpatchers = [
        observeCalls(window.history, 'pushState', () => checkForURLChange()),
        observeCalls(window.history, 'replaceState', () => checkForURLChange()),
      ];
      this._unpatchHistory = () => unpatchers.forEach(cleanup => cleanup());
      this._listeners.add(window, 'popstate', () => checkForURLChange());
    }
  }

  /** Stop observing navigation changes. */
  disconnect() {
    this._unpatchHistory?.();
    this._listeners.removeAll();
  }
}
