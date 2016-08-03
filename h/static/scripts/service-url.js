'use strict';

var urlUtil = require('./util/url-util');

/**
 * A map of all route names to relative URLs on the Hypothesis service that
 * the client links to.
 *
 * The URLs are relative to the `serviceUrl` URL in the app's settings.
 */
var ROUTES = {
  'account.settings': 'account/settings',
  'forgot-password': 'forgot-password',
  'groups.leave': 'groups/:id/leave',
  'groups.new': 'groups/new',
  'help': 'docs/help',
  'signup': 'signup',
  'search.tag': 'stream?q=tag::tag',
  'user': 'u/:user',
};

/**
 * A service which maps route names to URLs on the Hypothesis annotation
 * service.
 */
// @ngInject
function serviceUrl(settings) {
  return function (route, params) {
    params = params || {};

    var path = ROUTES[route];
    if (!path) {
      throw new Error('Unknown route ' + route);
    }
    var url = urlUtil.replaceURLParams(path, params);

    var unused = Object.keys(url.params);
    if (unused.length > 0) {
      throw new Error('Unknown route parameters: ' + unused.join(', '));
    }

    return settings.serviceUrl + url.url;
  };
}

module.exports = serviceUrl;
