/**
 * @typedef {import('../../types/config').HostConfig} HostConfig
 */

import serviceConfig from '../service-config';

/**
 * Is the sharing of annotations enabled? Check for any defined `serviceConfig`,
 * but default to `true` if none found.
 *
 * @param {HostConfig} settings
 * @return {boolean}
 */
export function sharingEnabled(settings) {
  const serviceConfig_ = serviceConfig(settings);
  if (serviceConfig_ === null) {
    return true;
  }
  if (typeof serviceConfig_.enableShareLinks !== 'boolean') {
    return true;
  }
  return serviceConfig_.enableShareLinks;
}

/**
 * Return any defined standalone URI for this `annotation`, preferably the
 * `incontext` URI, but fallback to `html` link if not present.
 *
 * @param {object} annotation
 * @return {string|undefined}
 */
export function shareURI(annotation) {
  const links = annotation.links;
  return links && (links.incontext || links.html);
}

/**
 * For an annotation to be "shareable", sharing links need to be enabled overall
 * and the annotation itself needs to have a sharing URI.
 *
 * @param {object} annotation
 * @param {HostConfig} settings
 * @return {boolean}
 */
export function isShareable(annotation, settings) {
  return !!(sharingEnabled(settings) && shareURI(annotation));
}
