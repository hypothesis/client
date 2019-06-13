'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const Spinner = require('../spinner');

describe('Spinner', function() {
  const createSpinner = (props = {}) => mount(<Spinner {...props} />);

  // A spinner is a trivial component with no props. Just make sure it renders.
  it('renders', () => {
    const wrapper = createSpinner();
    assert.isTrue(wrapper.exists('.spinner'));
  });
});
