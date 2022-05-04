import { TinyEmitter } from 'tiny-emitter';

import { warnOnce } from '../shared/warn-once';

/**
 * List of feature flags that annotator code tests for.
 *
 * @type {string[]}
 */
const annotatorFlags = [];

/**
 * An observable container of feature flags.
 */
export class FeatureFlags extends TinyEmitter {
  /**
   * @param {string[]} knownFlags - Test seam. This is a list of known flags
   *   used to catch mistakes where code checks for an obsolete feature flag.
   */
  constructor(knownFlags = annotatorFlags) {
    super();

    /**
     * Map of flag name to enabled state.
     *
     * @type {Map<string, boolean>}
     */
    this._flags = new Map();
    this._knownFlags = knownFlags;
  }

  /**
   * Update the stored flags and notify observers via a "flagsChanged" event.
   *
   * @param {Record<string, boolean>} flags
   */
  update(flags) {
    this._flags.clear();
    for (let [flag, on] of Object.entries(flags)) {
      this._flags.set(flag, on);
    }
    this.emit('flagsChanged');
  }

  /**
   * Test if a feature flag is enabled.
   *
   * This will return false if the feature flags have not yet been received from
   * the backend. Code that uses a feature flag should handle subsequent changes
   * to the flag's state by listening for the "flagsChanged" event.
   *
   * @param {string} flag
   * @return {boolean}
   */
  flagEnabled(flag) {
    if (!this._knownFlags.includes(flag)) {
      warnOnce('Looked up unknown feature', flag);
      return false;
    }
    return this._flags.get(flag) ?? false;
  }

  /**
   * Return the state of all feature flags.
   *
   * To test whether an individual flag is enabled, use {@link flagEnabled}
   * instead.
   */
  allFlags() {
    return Object.fromEntries(this._flags);
  }
}
