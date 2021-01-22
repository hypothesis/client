import { mount } from 'enzyme';
import { createElement } from 'preact';

import SidebarPanel from '../sidebar-panel';
import { $imports } from '../sidebar-panel';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('SidebarPanel', () => {
  let fakeStore;
  let fakeScrollIntoView;

  const createSidebarPanel = props =>
    mount(<SidebarPanel panelName="testpanel" title="Test Panel" {...props} />);

  beforeEach(() => {
    fakeScrollIntoView = sinon.stub();

    fakeStore = {
      getState: sinon.stub().returns({
        sidebarPanels: {
          activePanelName: null,
        },
      }),
      isSidebarPanelOpen: sinon.stub().returns(false),
      toggleSidebarPanel: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
      'scroll-into-view': fakeScrollIntoView,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders the provided title', () => {
    const wrapper = createSidebarPanel({ title: 'My Panel' });
    const titleEl = wrapper.find('.sidebar-panel__title');
    assert.equal(titleEl.text(), 'My Panel');
  });

  it('renders an icon if provided', () => {
    const wrapper = createSidebarPanel({ icon: 'restricted' });

    const icon = wrapper.find('SvgIcon').filter({ name: 'restricted' });

    assert.isTrue(icon.exists());
  });

  it('closes the panel when close button is clicked', () => {
    const wrapper = createSidebarPanel({ panelName: 'flibberty' });

    wrapper.find('Button').props().onClick();

    assert.calledWith(fakeStore.toggleSidebarPanel, 'flibberty', false);
  });

  it('shows content if active', () => {
    fakeStore.isSidebarPanelOpen.returns(true);
    const wrapper = createSidebarPanel();
    assert.isTrue(wrapper.find('Slider').prop('visible'));
  });

  it('hides content if not active', () => {
    fakeStore.isSidebarPanelOpen.returns(false);
    const wrapper = createSidebarPanel();
    assert.isFalse(wrapper.find('Slider').prop('visible'));
  });

  context('when panel state changes', () => {
    // Establish a component with an initial state and then change
    // that state
    const wrapperWithInitialState = (initialState, props = {}) => {
      fakeStore.isSidebarPanelOpen.returns(initialState);
      const wrapper = createSidebarPanel(props);
      fakeStore.isSidebarPanelOpen.returns(!initialState);
      return wrapper;
    };

    it('scrolls panel into view when opened after being closed', () => {
      const wrapper = wrapperWithInitialState(false, {});
      // force re-render
      wrapper.setProps({});

      assert.calledOnce(fakeScrollIntoView);
    });

    it('fires `onActiveChanged` callback if provided when opened', () => {
      const fakeCallback = sinon.stub();
      const wrapper = wrapperWithInitialState(false, {
        onActiveChanged: fakeCallback,
      });
      // force re-render
      wrapper.setProps({});

      assert.calledWith(fakeCallback, true);
    });

    it('fires `onActiveChanged` callback if provided when closed', () => {
      const fakeCallback = sinon.stub();
      const wrapper = wrapperWithInitialState(true, {
        onActiveChanged: fakeCallback,
      });
      // force re-render
      wrapper.setProps({});

      assert.calledWith(fakeCallback, false);
    });

    it('does not scroll panel if already opened', () => {
      // First render: panel is active
      fakeStore.isSidebarPanelOpen.returns(true);
      const wrapper = createSidebarPanel();
      // Re-rendering should not cause `scrollIntoView` to be invoked
      // As the panel is already open
      wrapper.setProps({});

      assert.isFalse(fakeScrollIntoView.called);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createSidebarPanel(),
    })
  );
});
