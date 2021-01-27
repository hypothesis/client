import { mount } from 'enzyme';
import { createElement } from 'preact';

import Spinner from '../Spinner';

import { checkAccessibility } from '../../../test-util/accessibility';

describe('Spinner', function () {
  const createSpinner = (props = {}) => mount(<Spinner {...props} />);

  // A Spinner is a trivial component with no props. Just make sure it renders.
  it('renders', () => {
    const wrapper = createSpinner();
    assert.isTrue(wrapper.exists('.Spinner'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createSpinner(),
    })
  );
});
