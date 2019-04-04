'use strict';

const { mount } = require('enzyme');
const { createElement, render } = require('preact');
const propTypes = require('prop-types');

const { useTooltip } = require('../tooltip');

const { runUntilIdle } = require('./render-utils');

describe('useTooltip', () => {
  function Button({ hidden = false }) {
    const tooltip = useTooltip();

    if (hidden) {
      return null;
    }
    return (
      <button ref={tooltip} aria-label="Reply to message">
        Reply
      </button>
    );
  }
  Button.propTypes = { hidden: propTypes.bool };

  function currentTooltipLabel() {
    const container = document.querySelector('tooltip-container');
    return container.textContent || null;
  }

  function currentTooltipPos() {
    const container = document.querySelector('tooltip-container');
    const tooltipEl = container.firstChild;
    if (!tooltipEl) {
      return { top: null, left: null };
    }
    const rect = tooltipEl.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  }

  it('shows the tooltip when the element is hovered', () => {
    const wrapper = mount(<Button />);
    const button = wrapper.find('button').getDOMNode();

    // Use DOM APIs instead of `wrapper.simulate(event)` here because Enzyme
    // doesn't guarantee to dispatch an actual DOM event in order to trigger
    // event handler props (`onClick` etc).
    button.dispatchEvent(new Event('mouseover'));

    assert.equal(currentTooltipLabel(), 'Reply to message');
  });

  it('positions the tooltip near the target element', () => {
    // Create a container with a fixed position and font size so that
    // the tooltip appears in a predictable location.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '200px';
    container.style.left = '200px';
    container.style.fontSize = '13px';
    document.body.appendChild(container);

    // Render component and trigger tooltip display.
    runUntilIdle(() => {
      render(<Button />, container);
      container.querySelector('button').dispatchEvent(new Event('mouseover'));
    });

    // Wait for tooltip to render, measure its size and then position
    // itself in its final location.
    const { left, top } = currentTooltipPos();

    assert.closeTo(left, 130, 10);
    assert.closeTo(top, 180, 10);

    container.remove();
  });

  it('hides the tooltip when the element is unhovered', () => {
    const wrapper = mount(<Button />);
    const button = wrapper.find('button').getDOMNode();

    button.dispatchEvent(new Event('mouseover'));
    button.dispatchEvent(new Event('mouseout'));

    assert.equal(currentTooltipLabel(), null);
  });

  it('hides the tooltip when the element is removed', () => {
    const wrapper = mount(<Button />);
    const button = wrapper.find('button').getDOMNode();

    button.dispatchEvent(new Event('mouseover'));
    wrapper.setProps({ hidden: true });

    assert.equal(currentTooltipLabel(), null);
  });
});
