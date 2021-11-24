import { generateHexString } from '../../shared/random';

import { HTMLIntegration } from './html';
import { PDFIntegration, isPDF } from './pdf';
import {
  VitalSourceContentIntegration,
  VitalSourceContainerIntegration,
  vitalSourceFrameRole,
} from './vitalsource';

/**
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Create the integration that handles document-type specific aspects of
 * guest functionality. Also returns a frame identifier based on the
 * role of the frame: 'main' for the frame that holds the primary annotatable
 * content, or 'sub_[random string]' for other annotatable frames.
 *
 * @param {Annotator} annotator
 * @param {string|null} [frameIdentifier]
 * @return {[Integration, 'main'|`sub_${string}`]}.
 */
export function createIntegration(annotator, frameIdentifier = null) {
  if (isPDF()) {
    return [new PDFIntegration(annotator), 'main'];
  }

  const subFrameIdentifier = /** @type {const} */ (
    `sub_${generateHexString(10)}`
  );

  const vsFrameRole = vitalSourceFrameRole();
  if (vsFrameRole === 'container') {
    return [new VitalSourceContainerIntegration(annotator), subFrameIdentifier];
  } else if (vsFrameRole === 'content') {
    return [new VitalSourceContentIntegration(), 'main'];
  }

  return [
    new HTMLIntegration(),
    frameIdentifier === null ? 'main' : subFrameIdentifier,
  ];
}
