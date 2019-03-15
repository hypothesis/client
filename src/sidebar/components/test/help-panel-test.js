'use strict';

const angular = require('angular');

describe('helpPanel', function() {
  let fakeStore;
  let $componentController;
  let $rootScope;

  beforeEach(function() {
    fakeStore = {
      frames: sinon.stub().returns([]),
    };

    angular.module('h', []).component('helpPanel', require('../help-panel'));

    angular.mock.module('h', {
      store: fakeStore,
      serviceUrl: sinon.stub(),
    });

    angular.mock.inject(function(_$componentController_, _$rootScope_) {
      $componentController = _$componentController_;
      $rootScope = _$rootScope_;
    });
  });

  it('displays the URL and fingerprint of the first connected frame', function() {
    fakeStore.frames.returns([
      {
        uri: 'https://publisher.org/article.pdf',
        metadata: {
          documentFingerprint: '12345',
        },
      },
    ]);

    const $scope = $rootScope.$new();
    const ctrl = $componentController('helpPanel', { $scope: $scope });
    $scope.$digest();

    assert.equal(ctrl.url, 'https://publisher.org/article.pdf');
    assert.equal(ctrl.documentFingerprint, '12345');
  });
});
