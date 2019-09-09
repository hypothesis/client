'use strict';

const urlUtil = require('../util/url-util');

/**
 * A function that returns an absolute URL given a link name and params, by
 * expanding named URL templates received from the annotation service's API.
 *
 * The links object from the API is a map of link names to URL templates:
 *
 * {
 *   signup: "http://localhost:5000/signup",
 *   user: "http://localhost:5000/u/:user",
 *   ...
 * }
 *
 * Given a link name (e.g. 'user') and params (e.g. {user: 'bob'}) return
 * an absolute URL by expanding the named URL template from the API with the
 * given params (e.g. "http://localhost:5000/u/bob").
 *
 * Before the links object has been received from the API this function
 * always returns empty strings as the URLs. After the links object has been
 * received from the API this function starts returning the real URLs.
 *
 * @param {string} linkName - The name of the link to expand
 * @param {object} params - The params with which to expand the link
 * @returns {string} The expanded absolute URL, or an empty string if the
 *                   links haven't been received from the API yet
 * @throws {Error} If the links have been received from the API but the given
 *                 linkName is unknown
 * @throws {Error} If one or more of the params given isn't used in the URL
 *                 template
 *
 * @ngInject
 */
function serviceUrl(store, apiRoutes) {
  apiRoutes
    .links()
    .then(store.updateLinks)
    .catch(function(error) {
      console.warn('The links API request was rejected: ' + error.message);
    });

  return function(linkName, params) {
    const links = store.getState().links;

    if (links === null) {
      return '';
    }

    const path = links[linkName];

    if (!path) {
      throw new Error('Unknown link ' + linkName);
    }

    params = params || {};
    const url = urlUtil.replaceURLParams(path, params);

    const unused = Object.keys(url.params);
    if (unused.length > 0) {
      throw new Error('Unknown link parameters: ' + unused.join(', '));
    }

    return url.url;
  };
}

module.exports = serviceUrl;
