'use strict';

/**
 * Return the configuration for the annotation service which the client would retrieve
 * annotations from which may contain the authority, grantToken and icon.
 *
 * @param {Object} settings - The settings object which would contain the services array.
 */

function serviceConfig(settings) {
  if (!Array.isArray(settings.services) || settings.services.length === 0) {
    return null;
  }
  return settings.services[0];
}

module.exports = serviceConfig;
