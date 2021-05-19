import { parseJsonConfig } from '../../boot/parse-json-config';

import configFuncSettingsFrom from './config-func-settings-from';
import { urlFromLinkTag } from './url-from-link-tag';

export default function settingsFrom(window_) {
  const jsonConfigs = parseJsonConfig(window_.document);
  const configFuncSettings = configFuncSettingsFrom(window_);

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

    return jsonConfigs.annotations || annotationsFromURL();
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

    return jsonConfigs.group || groupFromURL();
  }

  // TODO: Move this to a coerce method
  function showHighlights() {
    let showHighlights_ = hostPageSetting('showHighlights');

    if (showHighlights_ === null) {
      showHighlights_ = 'always'; // The default value is 'always'.
    }

    // Convert legacy keys/values to corresponding current configuration.
    if (typeof showHighlights_ === 'boolean') {
      return showHighlights_ ? 'always' : 'never';
    }

    return showHighlights_;
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

    return jsonConfigs.query || queryFromURL();
  }

  function hostPageSetting(name, options = {}) {
    const hasDefaultValue = typeof options.defaultValue !== 'undefined';

    if (configFuncSettings.hasOwnProperty(name)) {
      return configFuncSettings[name];
    }

    if (jsonConfigs.hasOwnProperty(name)) {
      return jsonConfigs[name];
    }

    if (hasDefaultValue) {
      return options.defaultValue;
    }

    return null;
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
    get showHighlights() {
      return showHighlights();
    },
    get sidebarAppUrl() {
      return urlFromLinkTag(window_, 'sidebar', 'html');
    },
    get query() {
      return query();
    },
    hostPageSetting: hostPageSetting,
  };
}
