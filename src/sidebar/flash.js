'use strict';

/**
 * A service for displaying "flash" notification messages.
 */

// @ngInject
function flash(toastr) {
  return {
    info: toastr.info.bind(toastr),
    success: toastr.success.bind(toastr),
    warning: toastr.warning.bind(toastr),
    error: toastr.error.bind(toastr),
  };
}

module.exports = flash;
