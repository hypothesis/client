'use strict';

const angular = require('angular');

const events = require('../../events');
const util = require('../../directive/test/util');

describe('newNoteBtn', function() {
  let $rootScope;
  const sandbox = sinon.sandbox.create();
  const fakeStore = {
    frames: sinon
      .stub()
      .returns([
        { id: null, uri: 'www.example.org' },
        { id: '1', uri: 'www.example.org' },
      ]),
  };

  before(function() {
    angular
      .module('app', [])
      .component('selectionTabs', require('../selection-tabs'))
      .component('newNoteBtn', require('../new-note-btn'));
  });

  beforeEach(function() {
    const fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };
    const fakeSettings = { theme: 'clean' };

    angular.mock.module('app', {
      store: fakeStore,
      features: fakeFeatures,
      settings: fakeSettings,
    });

    angular.mock.inject(function(_$componentController_, _$rootScope_) {
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should broadcast BEFORE_ANNOTATION_CREATED event when the new note button is clicked', function() {
    const annot = {
      target: [],
      uri: 'www.example.org',
    };
    const elem = util.createDirective(document, 'newNoteBtn', {
      store: fakeStore,
    });
    sandbox.spy($rootScope, '$broadcast');
    elem.ctrl.onNewNoteBtnClick();
    assert.calledWith(
      $rootScope.$broadcast,
      events.BEFORE_ANNOTATION_CREATED,
      annot
    );
  });
});
