'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const IconButton = require('../icon-button');
const mockImportedComponents = require('./mock-imported-components');

describe('IconButton', () => {
  let fakeOnClick;

  function createComponent(props = {}) {
    return mount(
      <IconButton
        icon="fakeIcon"
        isActive={false}
        title="My Action"
        onClick={fakeOnClick}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnClick = sinon.stub();
    IconButton.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    IconButton.$imports.$restore();
  });

  it('adds active className if `isActive` is `true`', () => {
    const wrapper = createComponent({ isActive: true });

    assert.isTrue(wrapper.find('button').hasClass('is-active'));
  });

  it('renders `SvgIcon` for associated icon', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  it('sets ARIA `aria-pressed` attribute if `isActive`', () => {
    const wrapper = createComponent({ isActive: true });
    assert.isTrue(wrapper.find('button').prop('aria-pressed'));
  });

  it('invokes `onClick` callback when pressed', () => {
    const wrapper = createComponent();
    wrapper.find('button').simulate('click');
    assert.calledOnce(fakeOnClick);
  });

  it('adds additional class name passed in `className` prop', () => {
    const wrapper = createComponent({ className: 'my-class' });

    assert.isTrue(wrapper.hasClass('my-class'));
  });

  it('sets compact style if `useCompactStyle` is set`', () => {
    const wrapper = createComponent({ useCompactStyle: true });

    assert.isTrue(wrapper.find('button').hasClass('icon-button--compact'));
  });
});
