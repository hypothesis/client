'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const AnnotationActionButton = require('../annotation-action-button');
const mockImportedComponents = require('./mock-imported-components');

describe('AnnotationActionButton', () => {
  let fakeOnClick;

  function createComponent(props = {}) {
    return mount(
      <AnnotationActionButton
        icon="fakeIcon"
        isDisabled={false}
        label="My Action"
        onClick={fakeOnClick}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeOnClick = sinon.stub();
    AnnotationActionButton.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    AnnotationActionButton.$imports.$restore();
  });

  it('adds active className if `isActive` is `true`', () => {
    const wrapper = createComponent({ isActive: true });

    assert.isTrue(wrapper.find('button').hasClass('is-active'));
  });

  it('renders `SvgIcon` if icon property set', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find('SvgIcon').prop('name'), 'fakeIcon');
  });

  it('invokes `onClick` callback when pressed', () => {
    const wrapper = createComponent();
    wrapper.find('button').simulate('click');
    assert.calledOnce(fakeOnClick);
  });
});
