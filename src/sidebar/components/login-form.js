'use strict';

var angular = require('angular');

// @ngInject
function Controller($scope, $timeout, analytics, flash, session, formRespond, serviceUrl) {
  var pendingTimeout = null;

  function success(data) {
    if (data.userid) {
      $scope.$emit('auth', null, data);
    }
    analytics.track(analytics.events.LOGIN_SUCCESS);

    angular.copy({}, $scope.model);

    if ($scope.form) {
      $scope.form.$setPristine();
    }
  }

  function failure(form, response) {
    var errors;
    var reason;

    try {
      errors = response.data.errors;
      reason = response.data.reason;
    } catch (e) {
      reason = 'Oops, something went wrong on the server. ' +
        'Please try again later!';
    }

    analytics.track(analytics.events.LOGIN_FAILURE);
    
    return formRespond(form, errors, reason);
  }

  function timeout() {
    angular.copy({}, $scope.model);

    if ($scope.form) {
      $scope.form.$setPristine();
    }

    flash.info('For your security, ' +
               'the forms have been reset due to inactivity.');
  }

  function cancelTimeout() {
    if (!pendingTimeout) {
      return;
    }
    $timeout.cancel(pendingTimeout);
    pendingTimeout = null;
  }

  this.serviceUrl = serviceUrl;

  this.submit = function submit(form) {
    formRespond(form);
    if (!form.$valid) {
      return;
    }

    $scope.$broadcast('formState', form.$name, 'loading');

    var handler = session[form.$name];
    var _failure = angular.bind(this, failure, form);
    var res = handler($scope.model, success, _failure);

    res.$promise.finally(function() {
      return $scope.$broadcast('formState', form.$name, '');
    });
  };

  if (!$scope.model) {
    $scope.model = {};
  }

  // Stop the inactivity timeout when the scope is destroyed.
  var removeDestroyHandler = $scope.$on('$destroy', function () {
    cancelTimeout(pendingTimeout);
    $scope.$emit('auth', 'cancel');
  });

  // Skip the cancel when destroying the scope after a successful auth.
  $scope.$on('auth', removeDestroyHandler);

  // Reset the auth forms afterfive minutes of inactivity.
  $scope.$watchCollection('model', function(value) {
    cancelTimeout(pendingTimeout);
    if (value && !angular.equals(value, {})) {
      pendingTimeout = $timeout(timeout, 300000);
    }
  });
}

module.exports = {
  controller: Controller,
  controllerAs: 'vm',
  bindings: {
    onClose: '&',
  },
  template: require('../templates/login-form.html'),
};
