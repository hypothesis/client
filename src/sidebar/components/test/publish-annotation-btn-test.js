'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

const fakeStorage = {};
const fakeLocalStorage = {
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

  let element;

  beforeEach(function () {
    angular.mock.module('app');

    // create a new instance of the directive with default
    // attributes
    element = util.createDirective(document, 'publishAnnotationBtn', {
      group: {
        name: 'Public',
      },
      canPost: true,
      isShared: false,
      onSave: function () {},
      onSetPrivacy: function () {},
      onCancel: function () {},
    });
  });

  [
    {
      groupType: 'open',
      expectedIcon: 'public',
    },
    {
      groupType: 'restricted',
      expectedIcon: 'group',
    },
    {
      groupType: 'private',
      expectedIcon: 'group',
    },
  ].forEach(({ groupType, expectedIcon }) => {
    it('should set the correct group-type icon class', function () {
      element.ctrl.group = {
        name: 'My Group',
        type: groupType,
      };
      element.scope.$digest();
      const iconElement = element.find('.group-icon-container > i');
      assert.isTrue(iconElement.hasClass(`h-icon-${expectedIcon}`));
    });
  });

  it('should display "Post to Only Me"', function () {
    const buttons = element.find('button');
    assert.equal(buttons.length, 3);
    assert.equal(buttons[0].innerHTML, 'Post to Only Me');
  });

  it('should display "Post to Research Lab"', function () {
    element.ctrl.group = {
      name: 'Research Lab',
    };
    element.ctrl.isShared = true;
    element.scope.$digest();
    const buttons = element.find('button');
    assert.equal(buttons[0].innerHTML, 'Post to Research Lab');
  });

  it('should save when "Post..." is clicked', function () {
    const savedSpy = sinon.spy();
    element.ctrl.onSave = savedSpy;
    assert.ok(!savedSpy.called);
    angular.element(element.find('button')[0]).click();
    assert.ok(savedSpy.calledOnce);
  });

  it('should change privacy when privacy option selected', function () {
    const privacyChangedSpy = sinon.spy();
    // for existing annotations, the privacy should not be changed
    // unless the user makes a choice from the list
    element.ctrl.onSetPrivacy = privacyChangedSpy;

    assert.ok(!privacyChangedSpy.called);
    const privateOption = element.find('li')[1];
    const sharedOption = element.find('li')[0];
    angular.element(privateOption).click();
    assert.equal(privacyChangedSpy.callCount, 1);
    angular.element(sharedOption).click();
    assert.equal(privacyChangedSpy.callCount, 2);
  });

  it('should disable post buttons when posting is not possible', function () {
    element.ctrl.canPost = false;
    element.scope.$digest();
    let disabledBtns = element.find('button[disabled]');
    assert.equal(disabledBtns.length, 1);

    // check that buttons are enabled when posting is possible
    element.ctrl.canPost = true;
    element.scope.$digest();
    disabledBtns = element.find('button[disabled]');
    assert.equal(disabledBtns.length, 0);
  });

  it('should revert changes when cancel is clicked', function () {
    const cancelSpy = sinon.spy();
    element.ctrl.onCancel = cancelSpy;
    element.scope.$digest();
    const cancelBtn = element.find('.publish-annotation-cancel-btn');
    assert.equal(cancelBtn.length, 1);
    angular.element(cancelBtn).click();
    assert.equal(cancelSpy.callCount, 1);
  });

});
