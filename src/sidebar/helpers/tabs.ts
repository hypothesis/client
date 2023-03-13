// Functions that determine which tab an annotation should be displayed in.
import type { Annotation } from '../../types/api';
import type { TabName } from '../../types/sidebar';
import * as metadata from '../helpers/annotation-metadata';

/**
 * Return the tab in which an annotation should be displayed.
 */
export function tabForAnnotation(ann: Annotation): TabName {
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
 */
export function shouldShowInTab(ann: Annotation, tab: TabName): boolean {
  if (metadata.isWaitingToAnchor(ann)) {
    // Until this annotation anchors or fails to anchor, we do not know which
    // tab it should be displayed in.
    return false;
  }
  return tabForAnnotation(ann) === tab;
}
