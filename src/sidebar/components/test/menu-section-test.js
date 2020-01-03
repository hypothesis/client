const { createElement } = require('preact');
const { mount } = require('enzyme');

const MenuSection = require('../menu-section');
const mockImportedComponents = require('./mock-imported-components');

describe('MenuSection', () => {
  const createMenuSection = props =>
    mount(
      <MenuSection {...props}>
        <div className="menu-item">Test item</div>
      </MenuSection>
    );

  beforeEach(() => {
    MenuSection.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    MenuSection.$imports.$restore();
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
});
