'use strict';

var moderation = require('../moderation');
var util = require('../util');

var init = moderation.init;
var actions = moderation.actions;
var update = util.createReducer(moderation.update);

describe('moderation reducer', function () {
  describe('#fetchedFlagCounts', function () {
    it('updates the flag counts', function () {
      var state = update(init(), actions.fetchedFlagCounts({ 'flagged-id': 1, 'also-flagged-id': 2 }));
      assert.deepEqual(state.flagCounts, { 'flagged-id': 1, 'also-flagged-id': 2});
    });
  });

  describe('#flagCount', function () {
    it('returns the number of times the annotation was flagged', function () {
      var state = update(init(), actions.fetchedFlagCounts({ 'flagged-id': 1, 'also-flagged-id': 2 }));
      assert.equal(moderation.flagCount(state, 'flagged-id'), 1);
      assert.equal(moderation.flagCount(state, 'not-flagged-id'), 0);
    });
  });

  describe('#fetchedHiddenByModeratorIds', function () {
    it('updates the set of moderated IDs', function () {
      var state = update(init(), actions.fetchedHiddenByModeratorIds(['hidden-id']));
      assert.deepEqual(state.hiddenByModerator, {'hidden-id': true});
    });
  });

  describe('#isHiddenByModerator', function () {
    var state = update(init(), actions.fetchedHiddenByModeratorIds(['hidden-id']));

    it('returns true if the annotation was hidden', function () {
      assert.isTrue(moderation.isHiddenByModerator(state, 'hidden-id'));
    });

    it('returns false if the annotation was not hidden', function () {
      assert.isFalse(moderation.isHiddenByModerator(state, 'not-hidden-id'));
    });
  });

  describe('#annotationHiddenChanged', function () {
    it('alters the hidden status of the annotation', function () {
      var state = update(init(), actions.fetchedHiddenByModeratorIds(['hidden-id']));
      state = update(state, actions.annotationHiddenChanged('hidden-id', false));
      assert.isFalse(moderation.isHiddenByModerator(state, 'hidden-id'));
    });
  });
});
