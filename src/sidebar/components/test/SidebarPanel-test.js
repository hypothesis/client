import { CloseButton } from '@hypothesis/frontend-shared';
import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import SidebarPanel, { $imports } from '../SidebarPanel';

describe('SidebarPanel', () => {
  let fakeStore;
  let fakeScrollIntoView;

  const createSidebarPanel = props =>
    mount(
      <SidebarPanel panelName="testpanel" description="Test Panel" {...props}>
        <CloseButton />
      </SidebarPanel>,
    );

  beforeEach(() => {
    fakeScrollIntoView = sinon.stub();

    fakeStore = {
      isSidebarPanelOpen: sinon.stub().returns(true),
      toggleSidebarPanel: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      'scroll-into-view': fakeScrollIntoView,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders a panel with provided description', () => {
    const wrapper = createSidebarPanel({ description: 'My Panel' });
    const panel = wrapper.find('section');

    assert.equal(panel.prop('aria-label'), 'My Panel');
  });

  it('exposes a close handler via CloseableContext, that closes the panel', () => {
    const wrapper = createSidebarPanel({ panelName: 'flibberty' });

    // The CloseButton will use the handler exposed by the panel's CloseableContext
    wrapper.find(CloseButton).find('button').simulate('click');

    assert.calledWith(fakeStore.toggleSidebarPanel, 'flibberty', false);
  });

  [true, false].forEach(isOpen => {
    it('mounts content if active', () => {
      fakeStore.isSidebarPanelOpen.returns(isOpen);
      const wrapper = createSidebarPanel();
      assert.equal(wrapper.exists(CloseButton), isOpen);
    });
  });

  context('when initialFocus is provided', () => {
    [
      {
        disabled: false,
        direction: 'in',
        shouldFocus: true,
      },
      {
        disabled: true,
        direction: 'in',
        shouldFocus: false,
      },
      {
        disabled: false,
        direction: 'out',
        shouldFocus: false,
      },
      {
        disabled: true,
        direction: 'out',
        shouldFocus: false,
      },
    ].forEach(({ disabled, direction, shouldFocus }) => {
      it('focuses element when opened, if it is not disabled', () => {
        const fakeFocus = sinon.stub();
        const elementToFocus = {
          focus: fakeFocus,
          disabled,
        };
        const wrapper = createSidebarPanel({
          initialFocus: { current: elementToFocus },
        });

        wrapper.find('Slider').props().onTransitionEnd(direction);

        assert.equal(fakeFocus.called, shouldFocus);
      });
    });
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

    [true, false].forEach(initiallyOpen => {
      it('fires `onActiveChanged` callback when state changes, if provided', () => {
        const fakeCallback = sinon.stub();
        const wrapper = wrapperWithInitialState(initiallyOpen, {
          onActiveChanged: fakeCallback,
        });
        // force re-render
        wrapper.setProps({});

        assert.calledWith(fakeCallback, !initiallyOpen);
      });
    });

    it('scrolls panel into view when opened after being closed', () => {
      const wrapper = wrapperWithInitialState(false, {});
      // force re-render
      wrapper.setProps({});

      assert.calledOnce(fakeScrollIntoView);
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
    }),
  );
});
