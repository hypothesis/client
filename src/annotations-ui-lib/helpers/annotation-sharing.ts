import type { Annotation } from './types';

/**
 * Retrieve an appropriate sharing link for this annotation.
 *
 * If the annotation is on a shareable document (i.e. its document is
 * web-accessible), prefer the `incontext` (bouncer) link, but fallback to the
 * `html` (single-annotation `h` web view) link if needed.
 *
 * If the annotation is not on a shareable document, don't use the `incontext`
 * link as that won't work; only use the single-annotation-view `html` link.
 *
 * Note that `html` links are not provided by the service for third-party
 * annotations.
 */
export function annotationSharingLink(annotation: Annotation): string | null {
  if (isShareableURI(annotation.uri)) {
    return annotation.links?.incontext ?? annotation.links?.html ?? null;
  } else {
    return annotation.links?.html ?? null;
  }
}

/**
 * Are annotations made against `uri` meaningfully shareable? The
 * target URI needs to be available on the web, which here is determined by
 * a protocol of `http` or `https`.
 */
export function isShareableURI(uri: string): boolean {
  return /^http(s?):/i.test(uri);
}
