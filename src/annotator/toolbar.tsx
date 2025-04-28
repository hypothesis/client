import { createRef, render } from 'preact';
import type { RefObject } from 'preact';

import type { AnnotationTool } from '../types/annotator';
import Toolbar from './components/Toolbar';

export type ToolbarOptions = {
  createAnnotation: (tool: AnnotationTool) => void;
  setSidebarOpen: (open: boolean) => void;
  setHighlightsVisible: (visible: boolean) => void;
  sidebarContainerId?: string;
};

/**
 * Controller for the toolbar on the edge of the sidebar.
 *
 * This toolbar provides controls for opening and closing the sidebar, toggling
 * highlight visibility etc.
 */
export class ToolbarController {
  private _container: HTMLElement;
  private _activeTool: AnnotationTool | null;
  private _newAnnotationType: 'annotation' | 'note';
  private _useMinimalControls: boolean;
  private _highlightsVisible: boolean;
  private _sidebarOpen: boolean;
  private _sidebarContainerId?: string;
  private _closeSidebar: () => void;
  private _toggleSidebar: () => void;
  private _toggleHighlights: () => void;
  private _createAnnotation: (tool: AnnotationTool) => void;
  private _sidebarToggleButton: RefObject<HTMLButtonElement>;
  private _supportedAnnotationTools: AnnotationTool[];

  /**
   * @param container - Element into which the toolbar is rendered
   */
  constructor(container: HTMLElement, options: ToolbarOptions) {
    const { createAnnotation, setSidebarOpen, setHighlightsVisible } = options;

    this._container = container;
    this._activeTool = null;
    this._useMinimalControls = false;
    this._newAnnotationType = 'note';
    this._highlightsVisible = false;
    this._sidebarOpen = false;
    this._sidebarContainerId = options.sidebarContainerId;
    this._supportedAnnotationTools = ['selection'];

    this._closeSidebar = () => setSidebarOpen(false);
    this._toggleSidebar = () => setSidebarOpen(!this._sidebarOpen);
    this._toggleHighlights = () =>
      setHighlightsVisible(!this._highlightsVisible);
    this._createAnnotation = (tool: AnnotationTool) => {
      createAnnotation(tool);

      // For the text selection tool, the selection already exists so we can
      // create the new annotation immediately and open the sidebar for the
      // user to type. For other tools the user will first need to make a
      // selection (eg. by drawing a shape), then we can open the sidebar for
      // them to add text.
      if (tool === 'selection') {
        setSidebarOpen(true);
      }
    };

    /** Reference to the sidebar toggle button. */
    this._sidebarToggleButton = createRef();

    this.render();
  }

  getWidth() {
    const content = this._container.firstChild as HTMLElement;
    return content.getBoundingClientRect().width;
  }

  /** Set which annotation tool is displayed as pressed in the toolbar. */
  set activeTool(tool) {
    this._activeTool = tool;
    this.render();
  }

  get activeTool() {
    return this._activeTool;
  }

  /**
   * Set whether the toolbar is in the "minimal controls" mode where
   * only the "Close" button is shown.
   */
  set useMinimalControls(minimal) {
    this._useMinimalControls = minimal;
    this.render();
  }

  get useMinimalControls() {
    return this._useMinimalControls;
  }

  /**
   * Update the toolbar to reflect whether the sidebar is open or not.
   */
  set sidebarOpen(open) {
    this._sidebarOpen = open;
    this.render();
  }

  get sidebarOpen() {
    return this._sidebarOpen;
  }

  /**
   * Update the toolbar to reflect whether the "Create annotation" button will
   * create a page note (if there is no selection) or an annotation (if there is
   * a selection).
   */
  set newAnnotationType(type) {
    this._newAnnotationType = type;
    this.render();
  }

  get newAnnotationType() {
    return this._newAnnotationType;
  }

  /**
   * Update the toolbar to reflect whether highlights are currently visible.
   */
  set highlightsVisible(visible) {
    this._highlightsVisible = visible;
    this.render();
  }

  get highlightsVisible() {
    return this._highlightsVisible;
  }

  /**
   * Return the DOM element that toggles the sidebar's visibility.
   *
   * This will be `null` if {@link useMinimalControls} is true.
   */
  get sidebarToggleButton(): HTMLButtonElement | null {
    return this._sidebarToggleButton.current;
  }

  /** Set which tools are supported for creating new annotations. */
  set supportedAnnotationTools(tools) {
    this._supportedAnnotationTools = tools;
    this.render();
  }

  get supportedAnnotationTools() {
    return this._supportedAnnotationTools;
  }

  render() {
    render(
      <Toolbar
        activeTool={this._activeTool}
        closeSidebar={this._closeSidebar}
        createAnnotation={this._createAnnotation}
        newAnnotationType={this._newAnnotationType}
        isSidebarOpen={this._sidebarOpen}
        sidebarContainerId={this._sidebarContainerId}
        showHighlights={this._highlightsVisible}
        supportedTools={this._supportedAnnotationTools}
        toggleHighlights={this._toggleHighlights}
        toggleSidebar={this._toggleSidebar}
        toggleSidebarRef={this._sidebarToggleButton}
        useMinimalControls={this.useMinimalControls}
      />,
      this._container,
    );
  }
}
