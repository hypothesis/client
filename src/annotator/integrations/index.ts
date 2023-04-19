import type { Annotator, Integration } from '../../types/annotator';
import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';
import {
  VitalSourceContentIntegration,
  vitalSourceFrameRole,
} from './vitalsource';

/**
 * Create the integration that handles document-type specific aspects of
 * guest functionality.
 */
export function createIntegration(annotator: Annotator): Integration {
  if (isPDF()) {
    return new PDFIntegration(annotator);
  }

  const vsFrameRole = vitalSourceFrameRole();
  if (vsFrameRole === 'content') {
    return new VitalSourceContentIntegration(document.body);
  }

  return new HTMLIntegration({ features: annotator.features });
}
