import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export type ReplaceWhenOffscreenProps = {
  children: ComponentChildren;

  /**
   * The initial value to use for the height of the rendered children before
   * it can be measured.
   *
   * This is used to set the size of the placeholder content if the container
   * is initially off-screen.
   */
  defaultHeight: number;
};

/**
 * Find the nearest scrollable ancestor of `element`.
 */
function getScrollContainer(element: Element | null) {
  while (element) {
    if (getComputedStyle(element).overflowY === 'scroll') {
      return element;
    }
    element = element.parentElement;
  }
  return null;
}

/**
 * Container which renders its children if the container intersects the viewport,
 * or renders a cheap placeholder otherwise.
 *
 * This can be used to significantly reduce the cost of rendering "heavy"
 * components by not rendering them unless they are in view. When the children
 * are not rendered, a placeholder is shown instead that takes up the same
 * amount of space as the children did prior to them being un-rendered.
 */
export default function ReplaceWhenOffscreen({
  children,
  defaultHeight,
}: ReplaceWhenOffscreenProps) {
  const [rendered, setRendered] = useState(false);
  const [cachedHeight, setCachedHeight] = useState(defaultHeight);
  const container = useRef<HTMLDivElement | null>(null);

  // Determine the initial visibility of the container and setup observers to
  // render/un-render children as the container comes into/out-of view.
  useLayoutEffect(() => {
    const rootMargin = 400;
    const updateRendered = () => {
      const rect = container.current!.getBoundingClientRect();
      const visible =
        rect.bottom > -rootMargin &&
        rect.top <= window.innerHeight + rootMargin;
      setRendered(visible);
    };

    // TODO: Use a shared observer across instances of `ReplaceWhenOffscreen`.
    const scrollContainer = getScrollContainer(container.current);
    const io = new IntersectionObserver(updateRendered, {
      root: scrollContainer,
      rootMargin: `${rootMargin}px 0px`,
    });
    io.observe(container.current!);
    updateRendered();

    return () => {
      io.disconnect();
    };
  }, []);

  // Update cached height when the size of the rendered child elements changes.
  useLayoutEffect(() => {
    let ro: ResizeObserver | undefined;
    if (rendered) {
      setCachedHeight(container.current!.clientHeight);
      ro = new ResizeObserver(() => {
        setCachedHeight(container.current!.clientHeight);
      });
      ro.observe(container.current!);
    }

    return () => {
      ro?.disconnect();
    };
  }, [rendered]);

  return (
    <div ref={container} data-testid="offscreen-container">
      {rendered ? (
        children
      ) : (
        <div
          data-testid="offscreen-placeholder"
          style={{ height: cachedHeight + 'px' }}
        />
      )}
    </div>
  );
}
