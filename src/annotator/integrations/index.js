import { HTMLIntegration } from './html';
import { PDFIntegration } from './pdf';
import { VitalSourceIntegration } from './vitalsource';

/**
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Create the `Integration` implementation for the given document type.
 *
 * Integrations handle the document-type specific functionality of guest frames.
 *
 * @param {Annotator} guest
 * @param {string} documentType
 * @return {Integration}
 */
export function createIntegration(guest, documentType) {
  switch (documentType) {
    case 'html':
      return new HTMLIntegration(guest.element);
    case 'pdf':
      return new PDFIntegration(guest);
    case 'vitalsource':
      return new VitalSourceIntegration(guest.element);
    default:
      throw new Error('Unable to create integration. Unknown document type');
  }
}
