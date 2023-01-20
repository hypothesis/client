import type { PortRPC } from '../shared/messaging';

const ANNOTATION_COUNT_ATTR = 'data-hypothesis-annotation-count';

/**
 * Show the current count of public annotations in designated elements.
 *
 * Any time the count of public annotations changes, find all elements within
 * `rootEl` that have the `data-hypothesis-annotation-count` attribute and
 * replace their text content with the current count of public annotations.
 *
 * This allows publishers to add a count of annotations to their web pages.
 *
 * See:
 * https://h.readthedocs.io/projects/client/en/latest/publishers/host-page-integration.html#cmdoption-arg-data-hypothesis-annotation-count
 *
 */
export function annotationCounts(
  rootEl: Element,
  rpc: PortRPC<'publicAnnotationCountChanged', string>
) {
  rpc.on('publicAnnotationCountChanged', updateAnnotationCountElems);

  function updateAnnotationCountElems(newCount: number) {
    const elems = rootEl.querySelectorAll(`[${ANNOTATION_COUNT_ATTR}]`);
    Array.from(elems).forEach(elem => {
      elem.textContent = newCount.toString();
    });
  }
}
