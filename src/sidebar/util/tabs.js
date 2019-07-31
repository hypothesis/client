'use strict';

// Functions that determine which tab an annotation should be displayed in.

const metadata = require('./annotation-metadata');
const uiConstants = require('../ui-constants');

/**
 * Return the tab in which an annotation should be displayed.
 *
 * @param {Annotation} ann
 */
function tabForAnnotation(ann) {
  if (metadata.isOrphan(ann)) {
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
 */
function shouldShowInTab(ann, tab) {
  if (metadata.isWaitingToAnchor(ann)) {
    // Until this annotation anchors or fails to anchor, we do not know which
    // tab it should be displayed in.
    return false;
  }
  return tabForAnnotation(ann) === tab;
}

module.exports = {
  shouldShowInTab: shouldShowInTab,
  tabForAnnotation: tabForAnnotation,
};
