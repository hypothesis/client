'use strict';

var getApiUrl = require('../get-api-url');

describe('sidebar.getApiUrl', function () {
  context('when there is a service object in settings', function () {
    it('returns apiUrl from the service object', function () {
      var settings = {
        apiUrl: 'someApiUrl',
        services: [{
          apiUrl: 'someOtherApiUrl',
        }],
      };
      assert.equal(getApiUrl(settings), settings.services[0].apiUrl);
    });
  });

  context('when there is no service object in settings', function () {
    it('returns apiUrl from the settings object', function () {
      var settings = {
        apiUrl: 'someApiUrl',
      };
      assert.equal(getApiUrl(settings), settings.apiUrl);
    });
  });

  context('when there is a service object in settings but does not contain an apiUrl key', function () {
    it('throws error', function () {
      var settings = {
        apiUrl: 'someApiUrl',
        services: [{}],
      };
      assert.throws(
        function() { getApiUrl(settings); },
        Error,
        'Service should contain an apiUrl value');
    });
  });
});
