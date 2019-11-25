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

  it('applies any provided className to the button', () => {
    const wrapper = createComponent({ className: 'my-class' });
    assert.isTrue(wrapper.hasClass('my-class'));
  });
});
