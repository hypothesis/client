import { mount } from 'enzyme';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import MenuArrow, { $imports } from '../MenuArrow';

describe('MenuArrow', () => {
  const createComponent = (props = {}) => mount(<MenuArrow {...props} />);

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render an arrow pointing up by default', () => {
    const wrapper = createComponent();
    const arrowClasses = wrapper.find('Icon').props().classes;

    assert.notInclude(arrowClasses, 'rotate-180');
  });

  it('should render an arrow pointing down if direction is `down`', () => {
    const wrapper = createComponent({ direction: 'down' });
    const arrowClasses = wrapper.find('Icon').props().classes;

    assert.include(arrowClasses, 'rotate-180');
  });
});
