'use strict';

var annotationIds = require('../extract-annotation-query');

describe('annotation queries', function () {
  var annotation = annotationIds.extractAnnotationQuery('http://localhost:3000#annotations:alphanum3ric_-only');
  var queryVarA = annotationIds.extractAnnotationQuery('http://localhost:3000#annotations:q:user:USERNAME');
  var queryVarB = annotationIds.extractAnnotationQuery('http://localhost:3000#annotations:QuerY:user:USERNAME');
  var invalid = annotationIds.extractAnnotationQuery('http://localhost:3000#annotations:\"TRYINGTOGETIN\";EVILSCRIPT()');
         
  it ('accepts regular annotation id', function () {
    assert.equal(annotation.annotations, 'alphanum3ric_-only');
  });
         
  it ('returns null for query when annotation id exists', function() {
    assert.equal(annotation.query, null);
  });
         
  it ('returns null on invalid query / id', function() {
    assert.equal(invalid, null);
  });
         
  it ('produces a null annotation when valid query exists', function () {
    assert.equal(queryVarA.annotations, null);
  });
         
  it ('accepts query style A ("q:")', function () {
    assert.equal(queryVarA.query, 'user:USERNAME');
  });

  it ('accepts query style B ("query:")', function () {
    assert.equal (queryVarB.query, 'user:USERNAME');
  });

});
