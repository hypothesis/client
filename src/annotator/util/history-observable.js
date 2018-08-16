'use strict';

const Observable = require('zen-observable');

const interceptMethod = require('./intercept-method');

/**
 * Observe URL changes made via the History API.
 *
 * @param [History] history
 * @param [Location] location
 * @return {Observable<string>}
 */
function historyObservable(history = window.history, location = window.location) {
  return new Observable(observer => {
    let prevUrl = location.href;

    function checkForUrlChange() {
      const currentUrl = location.href;
      if (currentUrl !== prevUrl) {
        prevUrl = currentUrl;
        observer.next(currentUrl);
      }
    }

    // There are currently no browser events for URL changes made via the
    // History API 😞, so we monkey-patch the `window.history` object instead.
    const removeInterceptFns = [
      interceptMethod(history, 'pushState', checkForUrlChange),
      interceptMethod(history, 'replaceState', checkForUrlChange),
      interceptMethod(history, 'popState', checkForUrlChange),
    ];

    return () => {
      removeInterceptFns.forEach(fn => fn());
    };
  });
}

module.exports = historyObservable;
