/**
 * A service for displaying "flash" notification messages.
 */

// @ngInject
export default function flash(toastr) {
  return {
    info: toastr.info.bind(toastr),
    success: toastr.success.bind(toastr),
    warning: toastr.warning.bind(toastr),
    error: toastr.error.bind(toastr),
  };
}
