import { parseConfigFragment } from '../../shared/config-fragment';
import {
  toBoolean,
  toInteger,
  toObject,
  toString,
} from '../../shared/type-coercions';

/** @typedef {import('../../types/config').ConfigFromAnnotator} ConfigFromAnnotator */

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 *
 * @param {Window} window
 * @return {ConfigFromAnnotator}
 */
export function hostPageConfig(window) {
  const config = parseConfigFragment(window.location.href);

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  const paramWhiteList = [
    // Direct-linked annotation ID
    'annotations',

    // Direct-linked group ID
    'group',

    // Default query passed by url
    'query',

    // Config param added by the extension, Via etc.  indicating how Hypothesis
    // was added to the page.
    'appType',

    // Config params documented at
    // https://h.readthedocs.io/projects/client/en/latest/publishers/config/
    'openSidebar',
    'showHighlights',
    'services',
    'branding',

    // New note button override.
    // This should be removed once new note button is enabled for everybody.
    'enableExperimentalNewNoteButton',

    // Forces the sidebar to filter annotations to a single user.
    'focus',

    // Fetch config from a parent frame.
    'requestConfigFromFrame',

    // Theme which can either be specified as 'clean'.
    // If nothing is the specified the classic look is applied.
    'theme',

    'usernameUrl',
  ];

  // We need to coerce incoming values from the host config for 2 reasons:
  //
  // 1. New versions of via may no longer support passing any type other than
  // string and our client is set up to expect values that are in fact not a
  // string in some cases. This will help cast these values to the expected
  // type if they can be.
  //
  // 2. A publisher of our sidebar could accidentally pass un-sanitized values
  // into the config and this ensures they safely work downstream even if they
  // are incorrect.
  //
  // Currently we are only handling the following config values do to the fact
  // that via3 will soon discontinue passing boolean types or integer types.
  //  - requestConfigFromFrame
  //  - openSidebar
  //
  // It is assumed we should expand this list and coerce and eventually
  // even validate all such config values.
  // See https://github.com/hypothesis/client/issues/1968

  /** @type {Record<string, (value: unknown) => unknown>} */
  const coercions = {
    openSidebar: toBoolean,

    /** @param {unknown} value */
    requestConfigFromFrame: value => {
      if (typeof value === 'string') {
        // Legacy `requestConfigFromFrame` value which holds only the origin.
        return value;
      }
      const objectVal =
        /** @type {{ origin: unknown, ancestorLevel: unknown }} */ (
          toObject(value)
        );
      return {
        origin: toString(objectVal.origin),
        ancestorLevel: toInteger(objectVal.ancestorLevel),
      };
    },
  };

  /** @type {Record<string, unknown>} */
  const result = {};
  for (let [key, value] of Object.entries(config)) {
    if (!paramWhiteList.includes(key)) {
      continue;
    }

    // Ignore `null` values as these indicate a default value.
    // In this case the config value set in the sidebar app HTML config is
    // used.
    if (value === null) {
      continue;
    }

    if (coercions[key]) {
      result[key] = coercions[key](value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
