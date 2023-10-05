import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

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
    assert.isTrue(wrapper.find('PointerUpIcon').exists());
  });

  it('should render an arrow pointing down if direction is `down`', () => {
    const wrapper = createComponent({ direction: 'down' });
    assert.isTrue(wrapper.find('PointerDownIcon').exists());
  });
});
