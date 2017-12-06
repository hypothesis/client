'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

describe('selectionTabs', function () {
  var fakeSession = {
    state: {
      preferences: {
        show_sidebar_tutorial: false,
      },
    },
  };
  var fakeSettings = {
    enableExperimentalNewNoteButton: false,
  };

  before(function () {
    angular.module('app', [])
      .component('selectionTabs', require('../selection-tabs'));
  });

  beforeEach(function () {
    var fakeAnnotationUI = {};
    var fakeFeatures = {
      flagEnabled: sinon.stub().returns(true),
    };

    angular.mock.module('app', {
      annotationUI: fakeAnnotationUI,
      features: fakeFeatures,
      session: fakeSession,
      settings: fakeSettings,
    });
  });

  context('displays selection tabs, counts and a selection', function () {
    it('should display the tabs and counts of annotations and notes', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var tabs = elem[0].querySelectorAll('a');

      assert.include(tabs[0].textContent, 'Annotations');
      assert.include(tabs[1].textContent, 'Notes');
      assert.include(tabs[0].textContent, '123');
      assert.include(tabs[1].textContent, '456');
    });

    it('should display annotations tab as selected', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var tabs = elem[0].querySelectorAll('a');

      assert.isTrue(tabs[0].classList.contains('is-selected'));
    });

    it('should display notes tab as selected', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'note',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var tabs = elem[0].querySelectorAll('a');

      assert.isTrue(tabs[1].classList.contains('is-selected'));
    });

    it('should not show the clean theme when settings does not contain the clean theme option', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: '123',
        totalNotes: '456',
      });

      assert.isFalse(elem[0].querySelectorAll('.selection-tabs')[0].classList.contains('selection-tabs--theme-clean'));
    });

    it('should show the clean theme when settings contains the clean theme option', function () {
      angular.mock.module('app', {
        annotationUI: {},
        features: {
          flagEnabled: sinon.stub().returns(true),
        },
        settings: { theme: 'clean'},
      });

      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: '123',
        totalNotes: '456',
      });

      assert.isTrue(elem[0].querySelectorAll('.selection-tabs')[0].classList.contains('selection-tabs--theme-clean'));
    });

    it('should not display the new new note button when the annotations tab is active', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var newNoteElem = elem[0].querySelectorAll('new-note-btn');

      assert.equal(newNoteElem.length, 0);
    });

    it('should not display the new note button when the notes tab is active and the new note button is disabled', function () {
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'note',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var newNoteElem = elem[0].querySelectorAll('new-note-btn');

      assert.equal(newNoteElem.length, 0);
    });

    it('should display the new note button when the notes tab is active and the new note button is enabled', function () {
      fakeSettings.enableExperimentalNewNoteButton = true;
      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'note',
        totalAnnotations: '123',
        totalNotes: '456',
      });
      var newNoteElem = elem[0].querySelectorAll('new-note-btn');

      assert.equal(newNoteElem.length, 1);
    });

    it('should display the longer version of the no notes message when there are no notes', function () {
      fakeSession.state.preferences.show_sidebar_tutorial = false;
      fakeSettings.enableExperimentalNewNoteButton = false;

      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'note',
        totalAnnotations: '10',
        totalNotes: 0,
      });
      var unavailableMsg = elem[0].querySelector('.annotation-unavailable-message__label');
      var unavailableTutorial = elem[0].querySelector('.annotation-unavailable-message__tutorial');
      var noteIcon = unavailableTutorial.querySelector('i');

      assert.include(unavailableMsg.textContent, 'There are no page notes in this group.');
      assert.include(unavailableTutorial.textContent, 'Create one by clicking the');
      assert.isTrue(noteIcon.classList.contains('h-icon-note'));
    });

    it('should display the longer version of the no annotations message when there are no annotations', function () {
      fakeSession.state.preferences.show_sidebar_tutorial = false;
      fakeSettings.enableExperimentalNewNoteButton = false;

      var elem = util.createDirective(document, 'selectionTabs', {
        selectedTab: 'annotation',
        totalAnnotations: 0,
        totalNotes: '10',
      });
      var unavailableMsg = elem[0].querySelector('.annotation-unavailable-message__label');
      var unavailableTutorial = elem[0].querySelector('.annotation-unavailable-message__tutorial');
      var noteIcon = unavailableTutorial.querySelector('i');

      assert.include(unavailableMsg.textContent, 'There are no annotations in this group.');
      assert.include(unavailableTutorial.textContent, 'Create one by selecting some text and clicking the');
      assert.isTrue(noteIcon.classList.contains('h-icon-annotate'));
    });

    context('when the sidebar tutorial is displayed', function () {
      fakeSession.state.preferences.show_sidebar_tutorial = true;

      it('should display the shorter version of the no notes message when there are no notes', function () {
        var elem = util.createDirective(document, 'selectionTabs', {
          selectedTab: 'note',
          totalAnnotations: '10',
          totalNotes: 0,
        });
        var msg = elem[0].querySelector('.annotation-unavailable-message__label');

        assert.include(msg.textContent, 'There are no page notes in this group.');
        assert.notInclude(msg.textContent, 'Create one by clicking the');
        assert.notInclude(msg.textContent, 'Create one by selecting some text and clicking the');
      });

      it('should display the shorter version of the no annotations message when there are no annotations', function () {
        var elem = util.createDirective(document, 'selectionTabs', {
          selectedTab: 'annotation',
          totalAnnotations: 0,
          totalNotes: '10',
        });
        var msg = elem[0].querySelector('.annotation-unavailable-message__label');

        assert.include(msg.textContent, 'There are no annotations in this group.');
        assert.notInclude(msg.textContent, 'Create one by clicking the');
        assert.notInclude(msg.textContent, 'Create one by selecting some text and clicking the');
      });
    });
  });
});
