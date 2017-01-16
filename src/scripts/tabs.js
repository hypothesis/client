'use strict';

// Selectors that calculate the annotation counts displayed in tab headings
// and determine which tab an annotation should be displayed in.

var countIf = require('./util/array-util').countIf;
var metadata = require('./annotation-metadata');
var session = require('./reducers/session');
var uiConstants = require('./ui-constants');

/**
 * Return true if Annotations and Orphans should be displayed in separate tabs.
 *
 * @param {object} state - The current application state.
 */
function shouldSeparateOrphans(state) {
  return session.isFeatureEnabled(state, 'orphans_tab');
}

/**
 * Return the tab in which an annotation should be displayed.
 *
 * @param {Annotation} ann
 * @param {boolean} separateOrphans - True if orphans should be displayed in a
 *        separate tab.
 */
function tabForAnnotation(ann, separateOrphans) {
  if (metadata.isOrphan(ann) && separateOrphans) {
    return uiConstants.TAB_ORPHANS;
  } else if (metadata.isPageNote(ann)) {
    return uiConstants.TAB_NOTES;
  } else {
    return uiConstants.TAB_ANNOTATIONS;
  }
}

/**
 * Return true if an annotation should be displayed in a given tab.
 *
 * @param {Annotation} ann
 * @param {number} tab - The TAB_* value indicating the tab
 * @param {boolean} separateOrphans - True if orphans should be separated into
 *        their own tab.
 */
function shouldShowInTab(ann, tab, separateOrphans) {
  if (metadata.isWaitingToAnchor(ann) && separateOrphans) {
    // Until this annotation anchors or fails to anchor, we do not know which
    // tab it should be displayed in.
    return false;
  }
  return tabForAnnotation(ann, separateOrphans) === tab;
}

/**
 * Return the counts for the headings of different tabs.
 *
 * @param {Annotation[]} annotations - List of annotations to display
 * @param {boolean} separateOrphans - True if orphans should be displayed in a
 *        separate tab.
 */
function counts(annotations, separateOrphans) {
  var counts = {
    notes: countIf(annotations, metadata.isPageNote),
    annotations: countIf(annotations, metadata.isAnnotation),
    orphans: countIf(annotations, metadata.isOrphan),
    anchoring: countIf(annotations, metadata.isWaitingToAnchor),
  };

  if (separateOrphans) {
    return counts;
  } else {
    return Object.assign({}, counts, {
      annotations: counts.annotations + counts.orphans,
      orphans: 0,
    });
  }
}

module.exports = {
  counts: counts,
  shouldSeparateOrphans: shouldSeparateOrphans,
  shouldShowInTab: shouldShowInTab,
  tabForAnnotation: tabForAnnotation,
};
