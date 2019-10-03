'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const SidebarPanel = require('../sidebar-panel');

describe('SidebarPanel', () => {
  let fakeStore;
  let fakeScrollIntoView;

  const createSidebarPanel = props =>
    shallow(
      <SidebarPanel panelName="testpanel" title="Test Panel" {...props} />
    );

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

    SidebarPanel.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
      'scroll-into-view': fakeScrollIntoView,
    });
  });

  afterEach(() => {
    SidebarPanel.$imports.$restore();
  });

  it('renders the provided title', () => {
    const wrapper = createSidebarPanel({ title: 'My Panel' });
    const titleEl = wrapper.find('.sidebar-panel__title');
    assert.equal(titleEl.text(), 'My Panel');
  });

  it('closes the panel when close button is clicked', () => {
    const wrapper = createSidebarPanel({ panelName: 'flibberty' });
    wrapper.find('button').simulate('click');

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

  it('scrolls panel into view when opened', () => {
    fakeStore.isSidebarPanelOpen.returns(false);
    // Initial render will establish in state that the panel is not active
    const wrapper = createSidebarPanel();
    // Now, make it so the panel will have an active state
    fakeStore.isSidebarPanelOpen.returns(true);

    // Trick to make things re-render now with updated state
    wrapper.setProps({});

    assert.calledOnce(fakeScrollIntoView);
  });

  it('does not scroll panel if already opened', () => {
    fakeStore.isSidebarPanelOpen.returns(true);
    // Initial render will establish in state that the panel is already active
    const wrapper = createSidebarPanel();

    // Re-rendering should not cause `scrollIntoView` to be invoked
    wrapper.setProps({});

    assert.isFalse(fakeScrollIntoView.called);
  });
});
