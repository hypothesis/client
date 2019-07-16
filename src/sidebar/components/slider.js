'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');

/**
 * A container which reveals its content when `visible` is `true` using
 * a sliding animation.
 *
 * Currently the only reveal/expand direction supported is top-down.
 */
function Slider({ children, visible, queueTask = setTimeout }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(visible ? 'auto' : 0);

  // Adjust the container height when the `visible` prop changes.
  useEffect(() => {
    const isVisible = containerHeight !== 0;
    if (visible === isVisible) {
      // Do nothing after the initial mount.
      return null;
    }

    const el = containerRef.current;
    if (visible) {
      // When expanding, transition the container to the current fixed height
      // of the content. After the transition completes, we'll reset to "auto"
      // height to adapt to future content changes.
      setContainerHeight(el.scrollHeight);
      return null;
    } else {
      // When collapsing, immediately change the current height to a fixed height
      // (in case it is currently "auto"), and then one tick later, transition
      // to 0.
      //
      // These steps are needed because browsers will not animate transitions
      // from "auto" => "0" and may not animate "auto" => fixed height => 0
      // if the first transition happens in the same tick.
      el.style.height = `${el.scrollHeight}px`;
      const timer = queueTask(() => {
        setContainerHeight(0);
      });
      return () => clearTimeout(timer);
    }
  }, [containerHeight, queueTask, visible]);

  const handleTransitionEnd = useCallback(() => {
    if (visible) {
      setContainerHeight('auto');
    }
  }, [setContainerHeight, visible]);

  return (
    <div
      // nb. Preact uses "ontransitionend" rather than "onTransitionEnd".
      // See https://bugs.chromium.org/p/chromium/issues/detail?id=961193
      //
      // eslint-disable-next-line react/no-unknown-property
      ontransitionend={handleTransitionEnd}
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'hidden',
        transition: 'height 0.15s ease-in',
      }}
    >
      {children}
    </div>
  );
}

Slider.propTypes = {
  children: propTypes.any,

  /**
   * Whether the content should be visible or not.
   */
  visible: propTypes.bool,

  /**
   * Test seam.
   *
   * Schedule a callback to run on the next tick.
   */
  queueTask: propTypes.func,
};

module.exports = Slider;
