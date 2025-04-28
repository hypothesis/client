import { checkAccessibility } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import Toolbar from '../Toolbar';

const noop = () => {};

describe('Toolbar', () => {
  const createToolbar = props =>
    mount(
      <Toolbar
        closeSidebar={noop}
        createAnnotation={noop}
        toggleHighlights={noop}
        toggleSidebar={noop}
        isSidebarOpen={false}
        showHighlights={false}
        newAnnotationType="note"
        {...props}
      />,
    );

  const findButton = (wrapper, label) =>
    wrapper.find(`button[title="${label}"]`);

  context('when `useMinimalControls` is true', () => {
    it('renders nothing if the sidebar is closed', () => {
      const wrapper = createToolbar({ useMinimalControls: true });
      assert.isFalse(wrapper.find('button').exists());
    });

    it('renders only the "Close" button if the sidebar is open', () => {
      const wrapper = createToolbar({
        useMinimalControls: true,
        isSidebarOpen: true,
      });
      assert.equal(wrapper.find('button').length, 1);
      assert.isTrue(findButton(wrapper, 'Close annotation sidebar').exists());
    });
  });

  it('renders the normal controls if `useMinimalControls` is false', () => {
    const wrapper = createToolbar({ useMinimalControls: false });
    assert.isFalse(findButton(wrapper, 'Close annotation sidebar').exists());
    assert.isTrue(findButton(wrapper, 'Annotation sidebar').exists());
    assert.isTrue(findButton(wrapper, 'Show highlights').exists());
    assert.isTrue(findButton(wrapper, 'New page note').exists());
  });

  it('shows the "New page note" button if `newAnnotationType` is `note`', () => {
    const wrapper = createToolbar({ newAnnotationType: 'note' });
    assert.isTrue(findButton(wrapper, 'New page note').exists());
  });

  it('shows the "New annotation" button if `newAnnotationType` is `annotation`', () => {
    const wrapper = createToolbar({ newAnnotationType: 'annotation' });
    assert.isTrue(findButton(wrapper, 'New annotation').exists());
  });

  it('toggles the sidebar when the sidebar toggle is clicked', () => {
    const toggleSidebar = sinon.stub();
    const wrapper = createToolbar({ isSidebarOpen: false, toggleSidebar });

    findButton(wrapper, 'Annotation sidebar').simulate('click');
    assert.calledWith(toggleSidebar);

    wrapper.setProps({ isSidebarOpen: true });
    findButton(wrapper, 'Annotation sidebar').simulate('click');
    assert.calledWith(toggleSidebar);
  });

  it('toggles highlight visibility when the highlights toggle is clicked', () => {
    const toggleHighlights = sinon.stub();
    const wrapper = createToolbar({ showHighlights: false, toggleHighlights });

    findButton(wrapper, 'Show highlights').simulate('click');
    assert.calledWith(toggleHighlights);

    wrapper.setProps({ showHighlights: true });
    findButton(wrapper, 'Show highlights').simulate('click');
    assert.calledWith(toggleHighlights);
  });

  it('announces highlight visibility', () => {
    const wrapper = createToolbar({ showHighlights: false });

    const statusEl = wrapper.find('[data-testid="toolbar-status"]');
    assert.equal(statusEl.text(), 'Highlights hidden');

    wrapper.setProps({ showHighlights: true });
    assert.equal(statusEl.text(), 'Highlights visible');
  });

  [true, false].forEach(showHighlights => {
    it('sets props in highlights toggle', () => {
      const wrapper = createToolbar({ showHighlights });
      const highlightsButton = findButton(wrapper, 'Show highlights');

      assert.equal(highlightsButton.prop('aria-pressed'), showHighlights);
    });
  });

  it('sets aria-controls in sidebar toggle button', () => {
    const wrapper = createToolbar({ sidebarContainerId: 'foo' });

    assert.equal(
      findButton(wrapper, 'Annotation sidebar').prop('aria-controls'),
      'foo',
    );
  });

  it('shows selection annotation button if `supportedTools` includes "selection"', () => {
    const createAnnotation = sinon.stub();
    const wrapper = createToolbar({
      createAnnotation,
      supportedTools: ['selection'],
    });

    const button = wrapper.find('button[data-testid="text-annotation"]');
    button.simulate('click');

    assert.calledWith(createAnnotation, 'selection');
  });

  it('hides rect annotation button if `supportedTools` does not include "rect"', () => {
    const wrapper = createToolbar();
    assert.isFalse(wrapper.exists('button[data-testid="rect-annotation"]'));
  });

  it('shows rect annotation button if `supportedTools` includes "rect"', () => {
    const createAnnotation = sinon.stub();
    const wrapper = createToolbar({
      createAnnotation,
      supportedTools: ['selection', 'rect'],
    });

    const button = wrapper.find('button[data-testid="rect-annotation"]');
    button.simulate('click');

    assert.calledWith(createAnnotation, 'rect');
  });

  it('hides point annotation button if `supportedTools` does not include "point"', () => {
    const wrapper = createToolbar();
    assert.isFalse(wrapper.exists('button[data-testid="point-annotation"]'));
  });

  it('shows point annotation button if `supportedTools` includes "point"', () => {
    const createAnnotation = sinon.stub();
    const wrapper = createToolbar({
      createAnnotation,
      supportedTools: ['selection', 'rect', 'point'],
    });

    const button = wrapper.find('button[data-testid="point-annotation"]');
    button.simulate('click');

    assert.calledWith(createAnnotation, 'point');
  });

  it('displays active tool as pressed', () => {
    const wrapper = createToolbar({
      supportedTools: ['selection', 'rect', 'point'],
    });

    const pressedButton = () => {
      const rectButton = wrapper.find('button[data-testid="rect-annotation"]');
      if (rectButton.prop('aria-pressed')) {
        return 'rect';
      }
      const pointButton = wrapper.find(
        'button[data-testid="point-annotation"]',
      );
      if (pointButton.prop('aria-pressed')) {
        return 'point';
      }
      return null;
    };

    assert.equal(pressedButton(), null);

    wrapper.setProps({ activeTool: 'rect' });
    assert.equal(pressedButton(), 'rect');

    wrapper.setProps({ activeTool: 'point' });
    assert.equal(pressedButton(), 'point');
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createToolbar(),
      },
      {
        name: 'with minimal controls',
        content: () =>
          createToolbar({
            useMinimalControls: true,
            isSidebarOpen: false,
          }),
      },
    ]),
  );
});
