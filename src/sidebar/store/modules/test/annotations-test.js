'use strict';

var annotations = require('../annotations');
var selection = require('../selection');
var createStore = require('../../create-store');

var fixtures = require('../../../test/annotation-fixtures');
var unroll = require('../../../../shared/test/util').unroll;

var { actions, selectors } = annotations;

// Tests for most of the functionality in the "annotations" module are currently
// in the tests for the whole Redux store.

describe('annotations reducer', function () {
  describe('#savedAnnotations', function () {
    var savedAnnotations = selectors.savedAnnotations;

    it('returns annotations which are saved', function () {
      var state = {
        annotations: [fixtures.newAnnotation(), fixtures.defaultAnnotation()],
      };
      assert.deepEqual(savedAnnotations(state), [fixtures.defaultAnnotation()]);
    });
  });

  describe('#findIDsForTags', function () {
    var findIDsForTags = selectors.findIDsForTags;

    it('returns the IDs corresponding to the provided local tags', function () {
      var ann = fixtures.defaultAnnotation();
      var state = {
        annotations: [Object.assign(ann, {$tag: 't1'})],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), [ann.id]);
    });

    it('does not return IDs for annotations that do not have an ID', function () {
      var ann = fixtures.newAnnotation();
      var state = {
        annotations: [Object.assign(ann, {$tag: 't1'})],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), []);
    });
  });

  describe('#hideAnnotation', function () {
    it('sets the `hidden` state to `true`', function () {
      var store = createStore([annotations]);
      var ann = fixtures.moderatedAnnotation({ hidden: false });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.hideAnnotation(ann.id));

      var storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', function () {
    it('sets the `hidden` state to `false`', function () {
      var store = createStore([annotations]);
      var ann = fixtures.moderatedAnnotation({ hidden: true });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.unhideAnnotation(ann.id));

      var storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#updateFlagStatus', function () {
    unroll('updates the flagged status of an annotation', function (testCase) {
      var store = createStore([annotations]);
      var ann = fixtures.defaultAnnotation();
      ann.flagged = testCase.wasFlagged;
      ann.moderation = testCase.oldModeration;

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.updateFlagStatus(ann.id, testCase.nowFlagged));

      var storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.flagged, testCase.nowFlagged);
      assert.deepEqual(storeAnn.moderation, testCase.newModeration);
    }, [{
      // Non-moderator flags annotation
      wasFlagged: false,
      nowFlagged: true,
      oldModeration: undefined,
      newModeration: undefined,
    }, {
      // Non-moderator un-flags annotation
      wasFlagged: true,
      nowFlagged: false,
      oldModeration: undefined,
      newModeration: undefined,
    },{
      // Moderator un-flags an already unflagged annotation
      wasFlagged: false,
      nowFlagged: false,
      oldModeration: { flagCount: 1 },
      newModeration: { flagCount: 1 },
    },{
      // Moderator flags an already flagged annotation
      wasFlagged: true,
      nowFlagged: true,
      oldModeration: { flagCount: 1 },
      newModeration: { flagCount: 1 },
    },{
      // Moderator flags annotation
      wasFlagged: false,
      nowFlagged: true,
      oldModeration: { flagCount: 0 },
      newModeration: { flagCount: 1 },
    },{
      // Moderator un-flags annotation
      wasFlagged: true,
      nowFlagged: false,
      oldModeration: { flagCount: 1 },
      newModeration: { flagCount: 0 },
    }]);
  });

  describe('#directLinkedAnnotation', () => {
    var directLinkedAnn = {
      id: 'abcdef',
    };

    it('returns null if no direct-linked annotation', () => {
      var store = createStore([annotations, selection], [{}]);
      assert.equal(store.directLinkedAnnotation(), null);
    });

    it('returns null if direct-linked annotation not yet loaded', () => {
      var store = createStore([annotations, selection], [{
        annotations: directLinkedAnn.id,
      }]);
      assert.equal(store.directLinkedAnnotation(), null);
    });

    it('returns the direct-linked annotation if loaded', () => {
      var store = createStore([annotations, selection], [{
        annotations: directLinkedAnn.id,
      }]);
      store.addAnnotations([directLinkedAnn]);
      assert.ok(store.directLinkedAnnotation());
      assert.deepEqual(store.directLinkedAnnotation().id, directLinkedAnn.id);
    });
  });
});
