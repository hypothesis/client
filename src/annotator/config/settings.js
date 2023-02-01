import { hasOwn } from '../../shared/has-own';
import { parseJsonConfig } from '../../boot/parse-json-config';
import { toBoolean } from '../../shared/type-coercions';

import { configFuncSettingsFrom } from './config-func-settings-from';
import { urlFromLinkTag } from './url-from-link-tag';

/**
 * @typedef SettingsGetters
 * @prop {string|null} annotations
 * @prop {string|null} query
 * @prop {string|null} group
 * @prop {string} showHighlights
 * @prop {string} clientUrl
 * @prop {string} sidebarAppUrl
 * @prop {string} notebookAppUrl
 * @prop {string} profileAppUrl
 * @prop {(name: string) => unknown} hostPageSetting
 */

/**
 * Discard a setting if it is not a string.
 *
 * @param {unknown} value
 */
function checkIfString(value) {
  return typeof value === 'string' ? value : null;
}

/**
 * @param {Window} window_
 * @return {SettingsGetters}
 */
export function settingsFrom(window_) {
  // Prioritize the `window.hypothesisConfig` function over the JSON format
  // Via uses `window.hypothesisConfig` and makes it non-configurable and non-writable.
  // In addition, Via sets the `ignoreOtherConfiguration` option to prevent configuration merging.
  const configFuncSettings = configFuncSettingsFrom(window_);

  /** @type {Record<string, unknown>} */
  let jsonConfigs;
  if (toBoolean(configFuncSettings.ignoreOtherConfiguration)) {
    jsonConfigs = {};
  } else {
    jsonConfigs = parseJsonConfig(window_.document);
  }

  /**
   * Return the `#annotations:*` ID from the given URL's fragment.
   *
   * If the URL contains a `#annotations:<ANNOTATION_ID>` fragment then return
   * the annotation ID extracted from the fragment. Otherwise return `null`.
   *
   * @return {string|null} - The extracted ID, or null.
   */
  function annotations() {
    /** Return the annotations from the URL, or null. */
    function annotationsFromURL() {
      // Annotation IDs are url-safe-base64 identifiers
      // See https://tools.ietf.org/html/rfc4648#page-7
      const annotFragmentMatch = window_.location.href.match(
        /#annotations:([A-Za-z0-9_-]+)$/
      );
      if (annotFragmentMatch) {
        return annotFragmentMatch[1];
      }
      return null;
    }

    return checkIfString(jsonConfigs.annotations) || annotationsFromURL();
  }

  /**
   * Return the `#annotations:group:*` ID from the given URL's fragment.
   *
   * If the URL contains a `#annotations:group:<GROUP_ID>` fragment then return
   * the group ID extracted from the fragment. Otherwise return `null`.
   *
   * @return {string|null} - The extracted ID, or null.
   */
  function group() {
    function groupFromURL() {
      const groupFragmentMatch = window_.location.href.match(
        /#annotations:group:([A-Za-z0-9_-]+)$/
      );
      if (groupFragmentMatch) {
        return groupFragmentMatch[1];
      }
      return null;
    }

    return checkIfString(jsonConfigs.group) || groupFromURL();
  }

  function showHighlights() {
    const value = hostPageSetting('showHighlights');

    switch (value) {
      case 'always':
      case 'never':
      case 'whenSidebarOpen':
        return value;
      case true:
        return 'always';
      case false:
        return 'never';
      default:
        return 'always';
    }
  }

  /**
   * Return the config.query setting from the host page or from the URL.
   *
   * If the host page contains a js-hypothesis-config script containing a
   * query setting then return that.
   *
   * Otherwise if the host page's URL has a `#annotations:query:*` (or
   * `#annotations:q:*`) fragment then return the query value from that.
   *
   * Otherwise return null.
   *
   * @return {string|null} - The config.query setting, or null.
   */
  function query() {
    /** Return the query from the URL, or null. */
    function queryFromURL() {
      const queryFragmentMatch = window_.location.href.match(
        /#annotations:(query|q):(.+)$/i
      );
      if (queryFragmentMatch) {
        try {
          return decodeURIComponent(queryFragmentMatch[2]);
        } catch (err) {
          // URI Error should return the page unfiltered.
        }
      }
      return null;
    }

    return checkIfString(jsonConfigs.query) || queryFromURL();
  }

  /**
   * Returns the first setting value found from the respective sources in order.
   *
   *  1. window.hypothesisConfig()
   *  2. <script class="js-hypothesis-config">
   *
   * If the setting is not found in either source, then return undefined.
   *
   * @param {string} name - Unique name of the setting
   */
  function hostPageSetting(name) {
    if (hasOwn(configFuncSettings, name)) {
      return configFuncSettings[name];
    }

    if (hasOwn(jsonConfigs, name)) {
      return jsonConfigs[name];
    }

    return undefined;
  }

  return {
    get annotations() {
      return annotations();
    },
    get clientUrl() {
      return urlFromLinkTag(window_, 'hypothesis-client', 'javascript');
    },
    get group() {
      return group();
    },
    get notebookAppUrl() {
      return urlFromLinkTag(window_, 'notebook', 'html');
    },
    get profileAppUrl() {
      return urlFromLinkTag(window_, 'profile', 'html');
    },
    get showHighlights() {
      return showHighlights();
    },
    get sidebarAppUrl() {
      return urlFromLinkTag(window_, 'sidebar', 'html');
    },
    get query() {
      return query();
    },
    hostPageSetting,
  };
}
