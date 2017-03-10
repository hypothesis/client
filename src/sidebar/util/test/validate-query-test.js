'use strict';

var queryUrl = require('../validate-query');

describe('queryUrl', function () {
  var qURL;
  var longqURL;
  var trickyqURL;
  var upperURL;
         
  beforeEach(function () {
    qURL = queryUrl('user:user_name');
    longqURL = queryUrl('user:user_nameany:hello');
    trickyqURL = queryUrl('user_bob__helloany:hello');
    upperURL = queryUrl('something');
  });
         
  it ('returns false on a non-query', function () {
    assert.equal(queryUrl({foo:'bar'}), null);
  });
         
  it('returns an annotation string as a query', function () {
    assert.equal(qURL, 'user:user_name');
  });
         
  it('accepts longer queries', function () {
    assert.equal(longqURL, 'user:user_name any: hello');
  });
         
  it ('is not tricked by confounding usernames or queries', function() {
    assert.equal(trickyqURL, 'user_bob__hello any: hello');
  });
         
  it ('accepts upper and lower case values', function () {
    assert.equal(upperURL, 'something');
  });
         
});
