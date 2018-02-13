'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

var fakeStorage = {};
var fakeLocalStorage = {
  setItem: function (key, value) {
    fakeStorage[key] = value;
  },
  getItem: function (key) {
    return fakeStorage[key];
  },
};

describe('publishAnnotationBtn', function () {
  before(function () {
    angular.module('app', [])
      .component('dropdownMenuBtn', require('../dropdown-menu-btn'))
      .component('publishAnnotationBtn', require('../publish-annotation-btn'))
      .factory('localStorage', function () {
        return fakeLocalStorage;
      });
  });

  var element;

  beforeEach(function () {
    angular.mock.module('app');

    // create a new instance of the directive with default
    // attributes
    element = util.createDirective(document, 'publishAnnotationBtn', {
      group: {
        name: 'Public',
        type: 'public',
      },
      canPost: true,
      isShared: false,
      onSave: function () {},
      onSetPrivacy: function () {},
      onCancel: function () {},
    });
  });

  it('should display "Post to Only Me"', function () {
    var buttons = element.find('button');
    assert.equal(buttons.length, 3);
    assert.equal(buttons[0].innerHTML, 'Post to Only Me');
  });

  it('should display "Post to Research Lab"', function () {
    element.ctrl.group = {
      name: 'Research Lab',
      type: 'group',
    };
    element.ctrl.isShared = true;
    element.scope.$digest();
    var buttons = element.find('button');
    assert.equal(buttons[0].innerHTML, 'Post to Research Lab');
  });

  it('should save when "Post..." is clicked', function () {
    var savedSpy = sinon.spy();
    element.ctrl.onSave = savedSpy;
    assert.ok(!savedSpy.called);
    angular.element(element.find('button')[0]).click();
    assert.ok(savedSpy.calledOnce);
  });

  it('should change privacy when privacy option selected', function () {
    var privacyChangedSpy = sinon.spy();
    // for existing annotations, the privacy should not be changed
    // unless the user makes a choice from the list
    element.ctrl.onSetPrivacy = privacyChangedSpy;

    assert.ok(!privacyChangedSpy.called);
    var privateOption = element.find('li')[1];
    var sharedOption = element.find('li')[0];
    angular.element(privateOption).click();
    assert.equal(privacyChangedSpy.callCount, 1);
    angular.element(sharedOption).click();
    assert.equal(privacyChangedSpy.callCount, 2);
  });

  it('should disable post buttons when posting is not possible', function () {
    element.ctrl.canPost = false;
    element.scope.$digest();
    var disabledBtns = element.find('button[disabled]');
    assert.equal(disabledBtns.length, 1);

    // check that buttons are enabled when posting is possible
    element.ctrl.canPost = true;
    element.scope.$digest();
    disabledBtns = element.find('button[disabled]');
    assert.equal(disabledBtns.length, 0);
  });

  it('should revert changes when cancel is clicked', function () {
    var cancelSpy = sinon.spy();
    element.ctrl.onCancel = cancelSpy;
    element.scope.$digest();
    var cancelBtn = element.find('.publish-annotation-cancel-btn');
    assert.equal(cancelBtn.length, 1);
    angular.element(cancelBtn).click();
    assert.equal(cancelSpy.callCount, 1);
  });

});
