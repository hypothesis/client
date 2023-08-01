/* global Navigation */
import { ListenerCollection } from '../../shared/listener-collection';

/**
 * Monkey-patch an object to observe calls to a method.
 *
 * The `handler` is not invoked if the observed method throws.
 *
 * @param handler - Handler that is invoked after the monitored method has been called.
 * @return Callback that removes the observer and restores `object[method]`.
 */
function observeCalls<T>(
  object: T,
  method: keyof T,
  handler: (...args: unknown[]) => void,
): () => void {
  const origHandler = object[method];

  /* istanbul ignore next */
  if (typeof origHandler !== 'function') {
    throw new Error('Can only intercept functions');
  }

  const wrapper = (...args: unknown[]) => {
    const result = origHandler.call(object, ...args);
    handler(...args);
    return result;
  };
  // @ts-expect-error Already checked type is function some lines above
  object[method] = wrapper;

  return () => {
    object[method] = origHandler;
  };
}

function stripFragment(url: string): string {
  return url.replace(/#.*/, '');
}

/**
 * Return the Navigation API entry point for the current window.
 *
 * This is a wrapper around `window.navigation` which checks both that the
 * object exists and has the expected type. See also
 * https://github.com/hypothesis/client/issues/5324.
 */
export function getNavigation(): EventTarget | null {
  const navigation = (window as any).navigation;
  if (
    // @ts-expect-error - Navigation API is missing from TS
    typeof Navigation === 'function' &&
    // @ts-expect-error
    navigation instanceof Navigation
  ) {
    return navigation;
  }
  return null;
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
  private _listeners: ListenerCollection;
  private _unpatchHistory: (() => void) | undefined;

  /**
   * Begin observing navigation changes.
   *
   * @param onNavigate - Callback invoked when a navigation
   *   occurs. The callback is fired after the navigation has completed and the
   *   new URL is reflected in `location.href`.
   * @param getLocation - Test seam that returns the current URL
   */
  constructor(
    onNavigate: (url: string) => void,
    /* istanbul ignore next - default overridden in tests */
    getLocation = () => location.href,
  ) {
    this._listeners = new ListenerCollection();

    let lastURL = getLocation();
    const checkForURLChange = (newURL = getLocation()) => {
      if (stripFragment(lastURL) !== stripFragment(newURL)) {
        lastURL = newURL;
        onNavigate(newURL);
      }
    };

    const navigation = getNavigation();
    if (navigation) {
      this._listeners.add(navigation, 'navigatesuccess', () =>
        checkForURLChange(),
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
