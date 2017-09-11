'use strict';

var angular = require('angular');

var events = require('../../events');
var util = require('../../directive/test/util');

describe('newNoteBtn', function () {
  var $rootScope;
  var sandbox = sinon.sandbox.create();
  var fakeAnnotationUI = {
    frames: sinon.stub().returns([{ id: null, uri: 'www.example.org'}, { id: '1', uri: 'www.example.org'}]),
  };

  before(function () {
    angular.module('app', [])
      .component('selectionTabs', require('../selection-tabs'))
      .component('newNoteBtn', require('../new-note-btn'));
  });

  beforeEach(function () {
    var fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };
    var fakeSettings = { theme: 'clean' };

    angular.mock.module('app', {
      annotationUI: fakeAnnotationUI,
      features: fakeFeatures,
      settings: fakeSettings,
    });

    angular.mock.inject(function (_$componentController_, _$rootScope_) {
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should broadcast BEFORE_ANNOTATION_CREATED event when the new note button is clicked', function () {
    var annot = {
      target: [],
      uri: 'www.example.org',
    };
    var elem = util.createDirective(document, 'newNoteBtn', {
      annotationUI: fakeAnnotationUI,
    });
    sandbox.spy($rootScope, '$broadcast');
    elem.ctrl.onNewNoteBtnClick();
    assert.calledWith($rootScope.$broadcast, events.BEFORE_ANNOTATION_CREATED, annot);
  });
});
