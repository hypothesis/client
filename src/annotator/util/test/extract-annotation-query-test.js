'use strict';

var unroll = require('../../../shared/test/util').unroll;

var annotationIds = require('../extract-annotation-query');

describe('annotation queries', function () {
         
  it ('returns null on invalid fragment', function () {
    assert.equal(annotationIds.extractAnnotationQuery(
      'http://localhost:3000#annotations:\"TRYINGTOGETIN\");EVILSCRIPT()'),
      null);
  });
         
  unroll('accepts annotation fragment from urls', function (testCase) {
    assert.equal(annotationIds.extractAnnotationQuery(testCase.url).annotations, testCase.result);
  }, [{
    url: 'http://localhost:3000#annotations:alphanum3ric_-only',
    result: 'alphanum3ric_-only',
  },
  ]);

  unroll('accepts query from annotation fragment', function(testCase) {
    assert.equal(annotationIds.extractAnnotationQuery(testCase.url).query, testCase.result);
  }, [{
    url: 'http://localhost:3000#annotations:q:user:USERNAME',
    result: 'user:USERNAME',
  },
  {
    url: 'http://localhost:3000#annotations:QuerY:user:USERNAME',
    result: 'user:USERNAME',
  }, {
    url: 'http://localhost:3000#annotations:q:user:USERNAME%20tag:KEYWORD',
    result: 'user:USERNAME tag:KEYWORD',
  }]);
});


