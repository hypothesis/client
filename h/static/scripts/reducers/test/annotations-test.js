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
});
