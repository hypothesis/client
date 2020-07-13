/**
 * Wrap a pair of browser functions for starting and clearing a timer in order
 * to enable flushing pending timers after each test.
 */
class TimerWrapper {
  /**
   * @param {(callback: () => void, delay?: ms) => number} setTimerMethod -
   *   Method used to start the timer (eg. `setTimeout`)
   * @param {(id: number) => void} clearTimeout - Method used to clear the timer
   */
  constructor(setTimerMethod, clearTimerMethod) {
    this.pendingCallbacks = new Map();
    this.setTimerMethod = setTimerMethod;
    this.clearTimerMethod = clearTimerMethod;
    this.nativeSetTimer = window[this.setTimerMethod];
    this.nativeClearTimer = window[this.clearTimerMethod];
  }

  install() {
    window[this.setTimerMethod] = (callback, delay) => {
      const id = this.nativeSetTimer.call(
        window,
        () => {
          this.pendingCallbacks.delete(id);
          callback();
        },
        // Some timer functions don't take a `delay` argument, but it
        // doesn't cause errors if `undefined` is passed.
        delay
      );
      this.pendingCallbacks.set(id, callback);
      return id;
    };

    window[this.clearTimerMethod] = id => {
      this.nativeClearTimer.call(window, id);
      this.pendingCallbacks.delete(id);
    };
  }

  flush() {
    for (let [, callback] of this.pendingCallbacks) {
      callback();
    }
    this.pendingCallbacks.clear();
  }
}

/**
 * Set up a mocha `afterEach` hook which flushes any pending timers after each
 * test ends.
 *
 * This prevents problems where a test starts a timer, finishes before the
 * timer has expired and the timer firing at some later point causes a confusing
 * test failure.
 *
 * Timers are flushed rather than canceled because this more closely matches the
 * behavior in the real application where the timers will eventually expire.
 */
export function flushTimersAfterEachTest() {
  const setTimeoutWrapper = new TimerWrapper('setTimeout', 'clearTimeout');
  const rafWrapper = new TimerWrapper(
    'requestAnimationFrame',
    'clearAnimationFrame'
  );

  setTimeoutWrapper.install();
  rafWrapper.install();

  afterEach(() => {
    setTimeoutWrapper.flush();
    rafWrapper.flush();
  });
}
