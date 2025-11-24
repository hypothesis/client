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
