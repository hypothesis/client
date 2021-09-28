import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';

/**
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Create the integration that handles document-type specific aspects of
 * guest functionality.
 *
 * This function creates the appropriate integration implementation for the
 * current document.
 *
 * @param {Annotator} annotator
 * @return {Integration}
 */
export function createIntegration(annotator) {
  if (isPDF()) {
    return new PDFIntegration(annotator);
  } else {
    return new HTMLIntegration();
  }
}
