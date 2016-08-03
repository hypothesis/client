'use strict';

var fixtures = require('./annotation-fixtures');
var tabCounts = require('../tab-counts');

describe('tabCounts', function () {
  var annotation = Object.assign(fixtures.defaultAnnotation(), {$orphan:false});
  var orphan = Object.assign(fixtures.defaultAnnotation(), {$orphan:true});

  it('counts Annotations and Orphans together when the Orphans tab is not enabled', function () {
    assert.deepEqual(tabCounts([annotation, orphan]), {
      anchoring: 0,
      annotations: 2,
      notes: 0,
      orphans: 0,
    });
  });

  it('counts Annotations and Orphans separately when the Orphans tab is enabled', function () {
    assert.deepEqual(tabCounts([annotation, orphan], {separateOrphans: true}), {
      anchoring: 0,
      annotations: 1,
      notes: 0,
      orphans: 1,
    });
  });
});
