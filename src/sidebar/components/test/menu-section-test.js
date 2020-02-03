import { mount } from 'enzyme';
import { createElement } from 'preact';

import MenuSection from '../menu-section';
import { $imports } from '../menu-section';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('MenuSection', () => {
  const createMenuSection = props =>
    mount(
      <MenuSection {...props}>
        <div className="menu-item">Test item</div>
      </MenuSection>
    );

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders the heading', () => {
    const wrapper = createMenuSection({ heading: 'A heading' });
    assert.equal(wrapper.find('h2').text(), 'A heading');
  });

  it('omits the heading if `heading` is not set', () => {
    const wrapper = createMenuSection();
    assert.isFalse(wrapper.exists('h2'));
  });

  it('renders menu items', () => {
    const wrapper = createMenuSection();
    assert.isTrue(wrapper.exists('li > .menu-item'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createMenuSection(),
    })
  );
});
