/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/config').HostConfig} HostConfig
 */

import serviceConfig from '../service-config';

/**
 * Generate a URI for sharing: a bouncer link built to share annotations in
 * a specific group (groupID) on a specific document (documentURI).
 *
 * @param {string} documentURI
 * @param {string} groupID
 * @return {string}
 */
export function getSharingLink(documentURI, groupID) {
  return `https://hyp.is/go?url=${encodeURIComponent(
    documentURI
  )}&group=${groupID}`;
}

/**
 * Are annotations made against `uri` meaningfully shareable? The
 * target URI needs to be available on the web, which here is determined by
 * a protocol of `http` or `https`.
 *
 * @param {string} uri
 * @return {boolean}
 */
export function isShareableURI(uri) {
  return /^http(s?):/.test(uri);
}

/**
 * Return the service-provided sharing URI for an annotation. Prefer the
 * `incontext` link when available; fallback to `html` if not present.
 *
 * @param {Annotation} annotation
 * @return {string|undefined}
 */
export function shareURI(annotation) {
  return annotation.links?.incontext ?? annotation.links?.html;
}

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
