'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const ActionButton = require('../action-button');
const mockImportedComponents = require('./mock-imported-components');

describe('ActionButton', () => {
  let fakeOnClick;

  function createComponent(props = {}) {
    return mount(
      <ActionButton
        icon="fakeIcon"
        label="My Action"
        onClick={fakeOnClick}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnClick = sinon.stub();
    ActionButton.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    ActionButton.$imports.$restore();
  });

  it('renders `SvgIcon` if icon property set', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  it('does not render `SvgIcon` if no icon property set', () => {
    const wrapper = createComponent({ icon: undefined });
    assert.isFalse(wrapper.find('SvgIcon').exists());
  });

  it('invokes `onClick` callback when pressed', () => {
    const wrapper = createComponent();
    wrapper.find('button').simulate('click');
    assert.calledOnce(fakeOnClick);
  });

  it('adds compact styles if `useCompactStyle` is `true`', () => {
    const wrapper = createComponent({ useCompactStyle: true });

    assert.isTrue(wrapper.find('button').hasClass('action-button--compact'));
  });

  context('in active state (`isActive` is `true`)', () => {
    it('adds `is-active` className', () => {
      const wrapper = createComponent({ isActive: true });

      assert.isTrue(wrapper.find('button').hasClass('is-active'));
    });

    it('sets `aria-pressed` attribute on button', () => {
      const wrapper = createComponent({ isActive: true });

      assert.isTrue(wrapper.find('button').prop('aria-pressed'));
    });
  });
});
