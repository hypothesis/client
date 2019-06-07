'use strict';

const { createElement, render } = require('preact');

const SvgIcon = require('../svg-icon');

describe('SvgIcon', () => {
  // Tests here use DOM APIs rather than Enzyme because SvgIcon uses
  // `dangerouslySetInnerHTML` for its content, and that is not visible in the
  // Enzyme tree.

  it("sets the element's content to the content of the SVG", () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" />, container);
    const svg = container.querySelector('svg');
    assert.ok(svg);
    assert.isAbove(svg.childElementCount, 0);
  });

  it('throws an error if the icon is unknown', () => {
    assert.throws(() => {
      const container = document.createElement('div');
      render(<SvgIcon name="unknown" />, container);
    });
  });

  it('does not set the class of the SVG by default', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.getAttribute('class'), null);
  });

  it('sets the class of the SVG if provided', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" className="thing__icon" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.getAttribute('class'), 'thing__icon');
  });

  it('retains the CSS class if the icon changes', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="expand-menu" className="thing__icon" />, container);
    render(<SvgIcon name="collapse-menu" className="thing__icon" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.getAttribute('class'), 'thing__icon');
  });

  it('preserves "width", "height" and "viewBox" attributes from the source', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.getAttribute('width'), '16px');
    assert.equal(svg.getAttribute('height'), '16px');
    assert.equal(svg.getAttribute('viewBox'), '0 0 16 16');
  });
});
