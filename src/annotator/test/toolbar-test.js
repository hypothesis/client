import { ToolbarController, $imports } from '../toolbar';

describe('ToolbarController', () => {
  let toolbarProps;
  let container;

  const createToolbar = options => {
    return new ToolbarController(container, {
      ...options,
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    toolbarProps = {};

    const FakeToolbar = props => {
      toolbarProps = props;
      return null;
    };

    $imports.$mock({
      './components/toolbar': FakeToolbar,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('has expected default state', () => {
    const controller = createToolbar();
    assert.equal(controller.useMinimalControls, false);
    assert.equal(controller.sidebarOpen, false);
    assert.equal(controller.highlightsVisible, false);
    assert.equal(controller.newAnnotationType, 'note');
  });

  it('re-renders when `useMinimalControls` changes', () => {
    const controller = createToolbar();
    assert.include(toolbarProps, {
      useMinimalControls: false,
    });

    controller.useMinimalControls = true;

    assert.include(toolbarProps, {
      useMinimalControls: true,
    });
  });

  it('re-renders when `sidebarOpen` changes', () => {
    const controller = createToolbar();
    assert.include(toolbarProps, {
      isSidebarOpen: false,
    });

    controller.sidebarOpen = true;

    assert.include(toolbarProps, {
      isSidebarOpen: true,
    });
  });

  it('re-renders when `highlightsVisible` changes', () => {
    const controller = createToolbar();
    assert.include(toolbarProps, {
      showHighlights: false,
    });

    controller.highlightsVisible = true;

    assert.include(toolbarProps, {
      showHighlights: true,
    });
  });

  it('re-renders when `newAnnotationType` changes', () => {
    const controller = createToolbar();
    assert.include(toolbarProps, {
      newAnnotationType: 'note',
    });

    controller.newAnnotationType = 'annotation';

    assert.include(toolbarProps, {
      newAnnotationType: 'annotation',
    });
  });

  it('toggles sidebar visibility', () => {
    const setSidebarOpen = sinon.stub();
    const controller = createToolbar({ setSidebarOpen });

    toolbarProps.toggleSidebar();
    assert.calledWith(setSidebarOpen, true);

    controller.sidebarOpen = true;
    toolbarProps.toggleSidebar();
    assert.calledWith(setSidebarOpen, false);
  });

  it('closes the sidebar', () => {
    const setSidebarOpen = sinon.stub();
    const controller = createToolbar({ setSidebarOpen });
    controller.useMinimalControls = true;

    toolbarProps.closeSidebar();

    assert.calledWith(setSidebarOpen, false);
  });

  it('toggles highlight visibility', () => {
    const setHighlightsVisible = sinon.stub();
    const controller = createToolbar({ setHighlightsVisible });

    toolbarProps.toggleHighlights();
    assert.calledWith(setHighlightsVisible, true);
    controller.highlightsVisible = true;

    toolbarProps.toggleHighlights();
    assert.calledWith(setHighlightsVisible, false);
  });

  it('creates an annotation', () => {
    const createAnnotation = sinon.stub();
    const setSidebarOpen = sinon.stub();
    createToolbar({ createAnnotation, setSidebarOpen });

    toolbarProps.createAnnotation();

    assert.called(createAnnotation);
    assert.called(setSidebarOpen);
  });

  describe('#getWidth', () => {
    it(`returns the toolbar's width`, () => {
      assert.isNumber(createToolbar().getWidth());
    });
  });

  describe('#sidebarToggleButton', () => {
    it(`returns a reference to the sidebar toggle button`, () => {
      const controller = createToolbar();
      toolbarProps.toggleSidebarRef.current = 'a-button';
      assert.equal(controller.sidebarToggleButton, 'a-button');
    });
  });
});
