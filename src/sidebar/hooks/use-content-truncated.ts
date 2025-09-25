import type { RefObject } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/**
 * Determines if the content of an element is truncated.
 *
 * Useful to use with elements with hidden overflow and ellipsis text-overflow,
 * to know if the content is truncated and the ellipsis is being shown.
 *
 * Be careful not to change the element's content based on this hooks result, or
 * you could end up triggering an infinite render loop.
 */
export function useContentTruncated(elementRef: RefObject<HTMLElement | null>) {
  const [isTruncated, setIsTruncated] = useState<boolean>(false);
  useEffect(() => {
    const buttonEl = elementRef.current;
    /* istanbul ignore next */
    if (!buttonEl) {
      return () => {};
    }

    const checkIsTruncated = () =>
      setIsTruncated(buttonEl.scrollWidth > buttonEl.clientWidth);

    // Check immediately if the element's content is truncated, and then again
    // every time it is resized
    checkIsTruncated();
    const observer = new ResizeObserver(checkIsTruncated);
    observer.observe(buttonEl);

    return () => observer.disconnect();
  }, [elementRef]);

  return isTruncated;
}
