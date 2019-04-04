'use strict';

const classnames = require('classnames');
const { createElement, render } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');
const propTypes = require('prop-types');

/**
 * A tooltip which points at a target DOM element.
 *
 * There is typically only one instance of this component rendered at any time,
 * via the `showTooltip` and `hideTooltip` functions.
 *
 * The tooltip's label is taken from the target's `aria-label` attribute.
 */
function Tooltip({ target }) {
  const label = target.getAttribute('aria-label');
  const targetRect = target.getBoundingClientRect();
  const TOOLTIP_ARROW_HEIGHT = 7;

  const [top, setTop] = useState(null);
  const [left, setLeft] = useState(null);
  const tooltipRef = useRef();

  useEffect(() => {
    // Once the tooltip has been rendered, measure its size and reposition it
    // above the target.
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const newTop = targetRect.top - tooltipRect.height - TOOLTIP_ARROW_HEIGHT;
    const newLeft = targetRect.right - tooltipRect.width;

    setTop(newTop);
    setLeft(newLeft);
  }, [setLeft, setTop, target]);

  return (
    <div
      className={classnames('tooltip', 'tooltip--down')}
      style={{
        visibility: top === null ? 'hidden' : '',
        top,
        left,
        position: 'fixed',
      }}
      ref={tooltipRef}
    >
      <span className="tooltip-label">{label}</span>
    </div>
  );
}

Tooltip.propTypes = {
  /** The DOM element that the tooltip should point to. */
  target: propTypes.object,
};

/**
 * DOM element where the global tooltip is rendered.
 */
let tooltipContainer;

/**
 * The DOM element which the global tooltip is currently pointing at.
 */
let currentTarget;

/**
 * Show the global tooltip, pointing at `element`.
 *
 * The tooltip label will be taken from the element's "aria-label" attribute.
 *
 * @param {Element} element
 */
function showTooltip(element) {
  if (!tooltipContainer) {
    // Use a custom element name to make it obvious what this element is when
    // eg. using the DOM inspector.
    tooltipContainer = document.createElement('tooltip-container');
    document.body.appendChild(tooltipContainer);
  }
  currentTarget = element;
  render(<Tooltip target={element} />, tooltipContainer);
}

/**
 * Hide the global tooltip, if currently pointing at `element`.
 *
 * @param {Element} element
 */
function hideTooltip(element) {
  if (element !== currentTarget) {
    return;
  }
  render(null, tooltipContainer);
  currentTarget = null;
}

/**
 * A React hook which causes a tooltip to be shown when an element is hovered.
 *
 * Returns a function which can be used as a `ref` prop on an element.
 *
 * @example
 *   function IconButton() {
 *     return (
 *      <button ref={useTooltip()} aria-label="Do something">
 *       <img .../>
 *      </button>
 *     );
 *   }
 * @return {(el: HTMLElement|null) => void}
 */
function useTooltip() {
  const prevEl = useRef();
  return useCallback(el => {
    if (prevEl.current) {
      // The element this tooltip was used with was changed or removed.
      hideTooltip(prevEl.current);
    }
    prevEl.current = el;

    if (el !== null) {
      el.addEventListener('mouseover', () => showTooltip(el));
      el.addEventListener('mouseout', () => hideTooltip(el));
    }
  }, []);
}

module.exports = {
  hideTooltip,
  showTooltip,
  useTooltip,
};
