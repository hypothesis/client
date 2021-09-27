import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';
import { VitalSourceIntegration, isVitalSource } from './vitalsource';

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
 * @param {import('../../types/annotator').Annotator} annotator
 * @param {string} clientURL - URL of the boot script for the client. This is
 *   used by some integrations to inject the client into child frames.
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
