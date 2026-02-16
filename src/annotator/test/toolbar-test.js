import { ToolbarController, $imports } from '../toolbar';

describe('ToolbarController', () => {
  let toolbarProps;
  let container;

  const createToolbar = options => {
    return new ToolbarController(container, {
      setSidebarOpen: sinon.stub(),
      ...options,
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    toolbarProps = {};

    const FakeToolbar = props => {
      toolbarProps = props;
      return <div style={{ width: '150px' }} />;
    };

    $imports.$mock({
      './components/Toolbar': FakeToolbar,
    });
  });

  afterEach(() => {
    $imports.$restore();
    container.remove();
  });

  it('has expected default state', () => {
    const controller = createToolbar();
    assert.equal(controller.useMinimalControls, false);
    assert.equal(controller.sidebarOpen, false);
    assert.equal(controller.highlightsVisible, false);
    assert.equal(controller.newAnnotationType, 'note');
  });

  it('passes sidebarContainerId to Toolbar when provided', () => {
    createToolbar({ sidebarContainerId: 'sidebar-iframe-container' });
    assert.equal(toolbarProps.sidebarContainerId, 'sidebar-iframe-container');
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

  it('re-renders when `supportedAnnotationTools` changes', () => {
    const controller = createToolbar();
    assert.deepEqual(controller.supportedAnnotationTools, ['selection']);
    assert.deepEqual(toolbarProps.supportedTools, ['selection']);

    controller.supportedAnnotationTools = ['selection', 'rect'];

    assert.deepEqual(toolbarProps.supportedTools, ['selection', 'rect']);
  });

  it('re-renders when `activeTool` changes', () => {
    const controller = createToolbar();
    assert.equal(controller.activeTool, null);
    assert.equal(toolbarProps.activeTool, null);

    controller.activeTool = 'rect';

    assert.equal(toolbarProps.activeTool, 'rect');
  });

  it('calls `setSidebarOpen` callback when sidebar toggle button is clicked', () => {
    const setSidebarOpen = sinon.stub();
    const controller = createToolbar({ setSidebarOpen });

    toolbarProps.toggleSidebar();
    assert.calledWith(setSidebarOpen, true);

    controller.sidebarOpen = true;
    toolbarProps.toggleSidebar();
    assert.calledWith(setSidebarOpen, false);
  });

  it('calls `setSidebarOpen` callback when sidebar close button is clicked', () => {
    const setSidebarOpen = sinon.stub();
    const controller = createToolbar({ setSidebarOpen });
    controller.useMinimalControls = true;

    toolbarProps.closeSidebar();

    assert.calledWith(setSidebarOpen, false);
  });

  it('calls `setHighlightsVisible` callback when highlights toggle button is clicked', () => {
    const setHighlightsVisible = sinon.stub();
    const controller = createToolbar({ setHighlightsVisible });

    toolbarProps.toggleHighlights();
    assert.calledWith(setHighlightsVisible, true);
    controller.highlightsVisible = true;

    toolbarProps.toggleHighlights();
    assert.calledWith(setHighlightsVisible, false);
  });

  it('calls `createAnnotation` callback when Create Note/Annotation button is clicked', () => {
    const createAnnotation = sinon.stub();
    const setSidebarOpen = sinon.stub();
    createToolbar({ createAnnotation, setSidebarOpen });

    toolbarProps.createAnnotation('selection');

    assert.calledWith(createAnnotation, 'selection');
    assert.called(setSidebarOpen);
  });

  it('does not open sidebar when createAnnotation is called with a non-selection tool', () => {
    const createAnnotation = sinon.stub();
    const setSidebarOpen = sinon.stub();
    createToolbar({ createAnnotation, setSidebarOpen });

    toolbarProps.createAnnotation('rect');

    assert.calledWith(createAnnotation, 'rect');
    assert.notCalled(setSidebarOpen);
  });

  describe('#getWidth', () => {
    it(`returns the toolbar's width`, () => {
      // For the measured width to return the correct value, the toolbar must be rendered
      // into a document.
      document.body.appendChild(container);
      const toolbar = createToolbar();
      assert.equal(toolbar.getWidth(), 150);
    });
  });

  describe('#sidebarToggleButton', () => {
    it(`returns a reference to the sidebar toggle button`, () => {
      const controller = createToolbar();
      toolbarProps.toggleSidebarRef.current = 'a-button';
      assert.equal(controller.sidebarToggleButton, 'a-button');
    });
  });

  describe('#keyboardModeState', () => {
    it('returns current keyboard mode state', () => {
      const controller = createToolbar();
      assert.deepEqual(controller.keyboardModeState, {
        keyboardActive: false,
        keyboardMode: null,
      });
    });

    it('re-renders when keyboard mode state is set', () => {
      const controller = createToolbar();
      controller.keyboardModeState = {
        keyboardActive: true,
        keyboardMode: 'resize',
      };

      assert.equal(toolbarProps.keyboardActive, true);
      assert.equal(toolbarProps.keyboardMode, 'resize');
    });
  });

  describe('#modeButtonCallbacks', () => {
    it('re-renders when mode button callbacks are set', () => {
      const controller = createToolbar();
      const onModeClick = sinon.stub();
      const onActivateMoveMode = sinon.stub();
      const onActivatePointMoveMode = sinon.stub();

      controller.modeButtonCallbacks = {
        onModeClick,
        onActivateMoveMode,
        onActivatePointMoveMode,
      };

      assert.equal(toolbarProps.onModeClick, onModeClick);
      assert.equal(toolbarProps.onActivateMoveMode, onActivateMoveMode);
      assert.equal(
        toolbarProps.onActivatePointMoveMode,
        onActivatePointMoveMode,
      );
    });
  });
});
