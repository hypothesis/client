import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';
import { VitalSourceIntegration, isVitalSource } from './vitalsource';

/**
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Create the `Integration` implementation for the given document type.
 *
 * Integrations handle the document-type specific functionality of guest frames.
 *
 * @param {import('../../types/annotator').Annotator} annotator
 * @param {string} clientURL
 * @return {Integration}
 */
export function createIntegration(annotator, clientURL) {
  if (isVitalSource()) {
    return new VitalSourceIntegration(annotator.element, clientURL);
  } else if (isPDF()) {
    return new PDFIntegration(annotator);
  } else {
    return new HTMLIntegration(annotator.element);
  }
}
