'use strict';

const redux = require('redux');
// `.default` is needed because 'redux-thunk' is built as an ES2015 module
const thunk = require('redux-thunk').default;

const annotations = require('../annotations');
const fixtures = require('../../../test/annotation-fixtures');
const util = require('../../util');
const unroll = require('../../../../shared/test/util').unroll;

const { actions, selectors } = annotations;

/**
 * Create a Redux store which only handles annotation actions.
 */
function createStore() {
  // Thunk middleware is needed for the ADD_ANNOTATIONS action.
  const enhancer = redux.applyMiddleware(thunk);
  const reducer = util.createReducer(annotations.update);
  return redux.createStore(reducer, annotations.init(), enhancer);
}

// Tests for most of the functionality in reducers/annotations.js are currently
// in the tests for the whole Redux store

describe('annotations reducer', function () {
  describe('#savedAnnotations', function () {
    const savedAnnotations = selectors.savedAnnotations;

    it('returns annotations which are saved', function () {
      const state = {
        annotations: [fixtures.newAnnotation(), fixtures.defaultAnnotation()],
      };
      assert.deepEqual(savedAnnotations(state), [fixtures.defaultAnnotation()]);
    });
  });

  describe('#findIDsForTags', function () {
    const findIDsForTags = selectors.findIDsForTags;

    it('returns the IDs corresponding to the provided local tags', function () {
      const ann = fixtures.defaultAnnotation();
      const state = {
        annotations: [Object.assign(ann, {$tag: 't1'})],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), [ann.id]);
    });

    it('does not return IDs for annotations that do not have an ID', function () {
      const ann = fixtures.newAnnotation();
      const state = {
        annotations: [Object.assign(ann, {$tag: 't1'})],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), []);
    });
  });

  describe('#hideAnnotation', function () {
    it('sets the `hidden` state to `true`', function () {
      const store = createStore();
      const ann = fixtures.moderatedAnnotation({ hidden: false });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.hideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', function () {
    it('sets the `hidden` state to `false`', function () {
      const store = createStore();
      const ann = fixtures.moderatedAnnotation({ hidden: true });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.unhideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#updateFlagStatus', function () {
    unroll('updates the flagged status of an annotation', function (testCase) {
      const store = createStore();
      const ann = fixtures.defaultAnnotation();
      ann.flagged = testCase.wasFlagged;
      ann.moderation = testCase.oldModeration;

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.updateFlagStatus(ann.id, testCase.nowFlagged));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
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
