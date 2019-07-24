'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');

/**
 * A container which reveals its content when `visible` is `true` using
 * a sliding animation.
 *
 * When the content is not partially or wholly visible, it is removed from the
 * DOM using `display: none` so it does not appear in the keyboard navigation
 * order.
 *
 * Currently the only reveal/expand direction supported is top-down.
 */
function Slider({ children, visible }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(visible ? 'auto' : 0);

  // Whether the content is currently partially or wholly visible. This is
  // different from `visible` when collapsing as it is true until the collapse
  // animation completes.
  const [contentVisible, setContentVisible] = useState(visible);

  // Adjust the container height when the `visible` prop changes.
  useEffect(() => {
    const isVisible = containerHeight !== 0;
    if (visible === isVisible) {
      // Do nothing after the initial mount.
      return;
    }

    const el = containerRef.current;
    if (visible) {
      // Show the content synchronously so that we can measure it here.
      el.style.display = '';

      // Make content visible in future renders.
      setContentVisible(true);

      // When expanding, transition the container to the current fixed height
      // of the content. After the transition completes, we'll reset to "auto"
      // height to adapt to future content changes.
      setContainerHeight(el.scrollHeight);
    } else {
      // When collapsing, immediately change the current height to a fixed height
      // (in case it is currently "auto"), force a synchronous layout,
      // then transition to 0.
      //
      // These steps are needed because browsers will not animate transitions
      // from "auto" => "0" and may not animate "auto" => fixed height => 0
      // if the layout tree transitions directly from "auto" => 0.
      el.style.height = `${el.scrollHeight}px`;

      // Force a sync layout.
      el.getBoundingClientRect();

      setContainerHeight(0);
    }
  }, [containerHeight, visible]);

  const handleTransitionEnd = useCallback(() => {
    if (visible) {
      setContainerHeight('auto');
    } else {
      // When the collapse animation completes, stop rendering the content so
      // that the browser has fewer nodes to render and the content is removed
      // from keyboard navigation.
      setContentVisible(false);
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
        display: contentVisible ? '' : 'none',
        height: containerHeight,
        overflow: 'hidden',
        transition: `height 0.15s ease-in`,
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
};

module.exports = Slider;
