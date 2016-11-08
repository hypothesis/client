'use strict';

var annotations = require('../annotations');
var fixtures = require('../../test/annotation-fixtures');

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
});
