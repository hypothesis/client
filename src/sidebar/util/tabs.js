// Functions that determine which tab an annotation should be displayed in.

import * as metadata from './annotation-metadata';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 *
 * @typedef {'annotation'|'note'|'orphan'} Tab
 */

/**
 * Return the tab in which an annotation should be displayed.
 *
 * @param {Annotation} ann
 * @return {Tab}
 */
export function tabForAnnotation(ann) {
  if (metadata.isOrphan(ann)) {
    return 'orphan';
  } else if (metadata.isPageNote(ann)) {
    return 'note';
  } else {
    return 'annotation';
  }
}

/**
 * Return true if an annotation should be displayed in a given tab.
 *
 * @param {Annotation} ann
 * @param {Tab} tab
 */
export function shouldShowInTab(ann, tab) {
  if (metadata.isWaitingToAnchor(ann)) {
    // Until this annotation anchors or fails to anchor, we do not know which
    // tab it should be displayed in.
    return false;
  }
  return tabForAnnotation(ann) === tab;
}
