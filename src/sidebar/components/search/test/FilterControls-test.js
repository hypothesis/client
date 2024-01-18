import { mount } from 'enzyme';

import FilterControls, { $imports } from '../FilterControls';

describe('FilterControls', () => {
  let fakeStore;

  const createComponent = (props = {}) => {
    return mount(<FilterControls {...props} />);
  };

  beforeEach(() => {
    fakeStore = {
      clearSelection: sinon.stub(),
      getFocusActive: sinon.stub().returns(new Set()),
      getFocusFilters: sinon.stub().returns({}),
      selectedAnnotations: sinon.stub().returns(0),
      toggleFocusMode: sinon.stub(),
    };

    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  /** Wrapper around toggle buttons in test output. */
  class ToggleButtonWrapper {
    /** Wrap the toggle button with the given `data-testid`. */
    constructor(wrapper, testId) {
      this.testId = testId;
      this.wrapper = wrapper;
      this.update();
    }

    exists() {
      return this.button.exists();
    }

    label() {
      return this.button.text();
    }

    /** Return true if button is rendered in the active state. */
    isActive() {
      return this.button.prop('pressed');
    }

    click() {
      this.button.find('button').simulate('click');
    }

    /** Refresh the wrapper after the parent is re-rendered. */
    update() {
      this.button = this.wrapper.find(`Button[data-testid="${this.testId}"]`);
    }
  }

  [true, false].forEach(withCardContainer => {
    it('returns nothing if there are no filters', () => {
      const wrapper = createComponent({ withCardContainer });
      assert.equal(wrapper.html(), '');
    });
  });

  it('displays selection toggle if there is a selection', () => {
    fakeStore.selectedAnnotations.returns([{ id: 'abc' }]);
    const wrapper = createComponent();
    const toggle = new ToggleButtonWrapper(wrapper, 'selection-toggle');
    assert.isTrue(toggle.exists());
    assert.isTrue(toggle.isActive());

    toggle.click();

    assert.calledOnce(fakeStore.clearSelection);
  });

  it('renders card container if requested', () => {
    fakeStore.selectedAnnotations.returns([{ id: 'abc' }]);
    const wrapper = createComponent({ withCardContainer: true });

    // The main controls of the component should be present, with an additional
    // container.
    assert.isTrue(wrapper.exists('Card'));
    const toggle = new ToggleButtonWrapper(wrapper, 'selection-toggle');
    assert.isTrue(toggle.exists());
  });

  [
    {
      filterType: 'user',
      focusFilters: {
        user: {
          display: 'Some User',
        },
      },
      label: 'By Some User',
    },
    {
      filterType: 'page',
      focusFilters: {
        page: {
          display: '10-30',
        },
      },
      label: 'Pages 10-30',
    },
    {
      filterType: 'cfi',
      focusFilters: {
        cfi: {
          display: 'Chapter One',
        },
      },
      label: 'Selected chapter',
    },
  ].forEach(({ filterType, focusFilters, label }) => {
    it(`displays ${filterType} toggle if there is a ${filterType} focus filter configured`, () => {
      // Configure and activate focus filter.
      fakeStore.getFocusFilters.returns(focusFilters);
      fakeStore.getFocusActive.returns(new Set([filterType]));

      // Toggle should be displayed and active.
      const wrapper = createComponent();
      const toggle = new ToggleButtonWrapper(
        wrapper,
        `${filterType}-focus-toggle`,
      );
      assert.isTrue(toggle.exists());
      assert.isTrue(toggle.isActive());
      assert.equal(toggle.label(), label);

      toggle.click();
      assert.calledWith(fakeStore.toggleFocusMode, { key: filterType });

      // Simulate focus filter being disabled. The button should be rendered in
      // a non-active state.
      fakeStore.getFocusActive.returns(new Set());
      wrapper.setProps({});
      toggle.update();
      assert.isFalse(toggle.isActive());
    });
  });
});
