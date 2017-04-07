'use strict';

var redux = require('redux');
// `.default` is needed because 'redux-thunk' is built as an ES2015 module
var thunk = require('redux-thunk').default;

var annotations = require('../annotations');
var fixtures = require('../../test/annotation-fixtures');
var util = require('../util');
var unroll = require('../../../shared/test/util').unroll;

var actions = annotations.actions;

/**
 * Create a Redux store which only handles annotation actions.
 */
function createStore() {
  // Thunk middleware is needed for the ADD_ANNOTATIONS action.
  var enhancer = redux.applyMiddleware(thunk);
  var reducer = util.createReducer(annotations.update);
  return redux.createStore(reducer, annotations.init(), enhancer);
}

// Tests for most of the functionality in reducers/annotations.js are currently
// in the tests for the whole Redux store

describe('annotations reducer', function () {
  describe('#savedAnnotations', function () {
    var savedAnnotations = annotations.savedAnnotations;

    it('returns annotations which are saved', function () {
      var state = {
        annotations: [fixtures.newAnnotation(), fixtures.defaultAnnotation()],
      };
      assert.deepEqual(savedAnnotations(state), [fixtures.defaultAnnotation()]);
    });
  });

  describe('#findIDsForTags', function () {
    var findIDsForTags = annotations.findIDsForTags;

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
      var store = createStore();
      var ann = fixtures.moderatedAnnotation({ hidden: false });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.hideAnnotation(ann.id));

      var storeAnn = annotations.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', function () {
    it('sets the `hidden` state to `false`', function () {
      var store = createStore();
      var ann = fixtures.moderatedAnnotation({ hidden: true });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.unhideAnnotation(ann.id));

      var storeAnn = annotations.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#updateFlagStatus', function () {
    unroll('updates the flagged status of an annotation', function (testCase) {
      var store = createStore();
      var ann = fixtures.defaultAnnotation();
      ann.flagged = testCase.wasFlagged;
      ann.moderation = testCase.oldModeration;

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.updateFlagStatus(ann.id, testCase.nowFlagged));

      var storeAnn = annotations.findAnnotationByID(store.getState(), ann.id);
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
});
