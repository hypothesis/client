'use strict';

module.exports = {
  controllerAs: 'vm',
  template: require('../templates/help_link.html'),
  controller: function () {},
  scope: {
    version: '<',
    userAgent: '<',
    url: '<',
    documentFingerprint: '<',
    auth: '<',
    dateTime: '<',
  },
};
