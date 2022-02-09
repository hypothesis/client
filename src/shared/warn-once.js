/** @type {Set<string>} */
let shownWarnings = new Set();

/**
 * Log a warning if it has not already been reported.
 *
 * This is useful to avoid spamming the console if a warning is emitted in a
 * context that may be called frequently.
 *
 * @param {...any} args -
 *   Arguments to forward to `console.warn`. The arguments `toString()` values
 *   are concatenated into a string key which is used to determine if the warning
 *   has been logged before.
 */
export function warnOnce(...args) {
  const key = args.join();
  if (shownWarnings.has(key)) {
    return;
  }
  console.warn(...args);
  shownWarnings.add(key);
}

warnOnce.reset = () => {
  shownWarnings.clear();
};
