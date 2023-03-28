import { TinyEmitter } from 'tiny-emitter';

import { warnOnce } from '../shared/warn-once';
import type { FeatureFlags as IFeatureFlags } from '../types/annotator';

/**
 * List of feature flags that annotator code tests for.
 */
const annotatorFlags = ['html_side_by_side', 'styled_highlight_clusters'];

/**
 * An observable container of feature flags.
 */
export class FeatureFlags extends TinyEmitter implements IFeatureFlags {
  /** Map of flag name to enabled state. */
  private _flags: Map<string, boolean>;
  private _knownFlags: string[];

  /**
   * @param knownFlags - Test seam. This is a list of known flags used to catch
   *        mistakes where code checks for an obsolete feature flag.
   */
  constructor(knownFlags: string[] = annotatorFlags) {
    super();

    this._flags = new Map<string, boolean>();
    this._knownFlags = knownFlags;
  }

  /**
   * Update the stored flags and notify observers via a "flagsChanged" event.
   */
  update(flags: Record<string, boolean>) {
    this._flags.clear();
    for (const [flag, on] of Object.entries(flags)) {
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
   */
  flagEnabled(flag: string): boolean {
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
  allFlags(): Record<string, boolean> {
    return Object.fromEntries(this._flags);
  }
}
