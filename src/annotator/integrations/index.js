import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';
import {
  VitalSourceContentIntegration,
  vitalSourceFrameRole,
} from './vitalsource';

/**
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').ContentPartner} ContentPartner
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Create the integration that handles document-type specific aspects of
 * guest functionality.
 *
 * @param {Annotator} annotator
 * @param {object} options
 *   @param {ContentPartner} [options.contentPartner] - Content partner banner to show,
 *     if supported by the integration.
 * @return {Integration}
 */
export function createIntegration(annotator, { contentPartner } = {}) {
  if (isPDF()) {
    return new PDFIntegration(annotator, { contentPartner });
  }

  const vsFrameRole = vitalSourceFrameRole();
  if (vsFrameRole === 'content') {
    return new VitalSourceContentIntegration();
  }

  return new HTMLIntegration({ features: annotator.features });
}
