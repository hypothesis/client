'use strict';

var metadata = require('./annotation-metadata');

function countIf(list, predicate) {
  return list.reduce(function (count, item) {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Return a count of the number of Annotations, Page Notes, Orphans and
 * annotations still being anchored in a set of `annotations`
 */
function tabCounts(annotations, opts) {
  opts = opts || {separateOrphans: false};

  var counts = {
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
