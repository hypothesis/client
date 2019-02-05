'use strict';

const serviceConfig = require('../service-config');

/**
 * Return `true` if the first configured service is a "third-party" service.
 *
 * Return `true` if the first custom annotation service configured in the
 * services array in the host page is a third-party service, `false` otherwise.
 *
 * If no custom annotation services are configured then return `false`.
 *
 * @param {Object} settings - the sidebar settings object
 *
 */
function isThirdPartyService(settings) {
  const service = serviceConfig(settings);

  if (service === null) {
    return false;
  }

  if (!service.hasOwnProperty('authority')) {
    return false;
  }

  return service.authority !== settings.authDomain;
}

module.exports = isThirdPartyService;
