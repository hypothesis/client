'use strict';

var metadata = require('./annotation-metadata');
var countIf = require('./util/array-util').countIf;

/**
 * Return a count of the number of Annotations, Page Notes, Actions, Orphans and
 * annotations still being anchored in a set of `annotations`
 */
function tabCounts(annotations, opts) {
  opts = opts || {separateOrphans: false};

  var counts = {
    actions: countIf(annotations, metadata.isAction),
    notes: countIf(annotations, metadata.isPageNote),
    annotations: countIf(annotations, metadata.isAnnotation),
    orphans: countIf(annotations, metadata.isOrphan),
    anchoring: countIf(annotations, metadata.isWaitingToAnchor),
  };

  if (opts.separateOrphans) {
    return counts;
  } else {
    return Object.assign({}, counts, {
      annotations: counts.annotations + counts.orphans,
      orphans: 0,
    });
  }
}

module.exports = tabCounts;
