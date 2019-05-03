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
    assert.ok(container.querySelector('svg'));
  });

  it('throws an error if the icon is unknown', () => {
    assert.throws(() => {
      const container = document.createElement('div');
      render(<SvgIcon name="unknown" />, container);
    });
  });

  it('sets the size of the SVG if provided', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" size={16} />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.style.width, '16px');
    assert.equal(svg.style.height, '16px');
  });

  it("uses the icon's default size if no size is provided", () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.style.width, '');
    assert.equal(svg.style.height, '');
  });
});
