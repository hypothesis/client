import { createElement, render } from 'preact';

import SvgIcon from '../svg-icon';

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

  it('does not set the class of the SVG by default', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="refresh" />, container);
    const svg = container.querySelector('svg');
    assert.equal(svg.getAttribute('class'), '');
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

  it('sets a default class on the wrapper element', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="expand-menu" />, container);
    const wrapper = container.querySelector('span');
    assert.isTrue(wrapper.classList.contains('svg-icon'));
    assert.isFalse(wrapper.classList.contains('svg-icon--inline'));
  });

  it('appends an inline class to wrapper if `inline` prop is `true`', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="expand-menu" inline={true} />, container);
    const wrapper = container.querySelector('span');
    assert.isTrue(wrapper.classList.contains('svg-icon'));
    assert.isTrue(wrapper.classList.contains('svg-icon--inline'));
  });

  it('sets a title to the containing `span` element if `title` is present', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="expand-menu" title="Open menu" />, container);
    const wrapper = container.querySelector('span');
    assert.equal(wrapper.getAttribute('title'), 'Open menu');
  });

  it('sets does not set a title on the containing `span` element if `title` not present', () => {
    const container = document.createElement('div');
    render(<SvgIcon name="expand-menu" />, container);
    const wrapper = container.querySelector('span');
    assert.notOk(wrapper.getAttribute('title'));
  });
});
