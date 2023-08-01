import { createRef, render } from 'preact';
import type { RefObject } from 'preact';

import Toolbar from './components/Toolbar';

export type ToolbarOptions = {
  createAnnotation: () => void;
  setSidebarOpen: (open: boolean) => void;
  setHighlightsVisible: (visible: boolean) => void;
};

/**
 * Controller for the toolbar on the edge of the sidebar.
 *
 * This toolbar provides controls for opening and closing the sidebar, toggling
 * highlight visibility etc.
 */
export class ToolbarController {
  private _container: HTMLElement;
  private _newAnnotationType: 'annotation' | 'note';
  private _useMinimalControls: boolean;
  private _highlightsVisible: boolean;
  private _sidebarOpen: boolean;
  private _closeSidebar: () => void;
  private _toggleSidebar: () => void;
  private _toggleHighlights: () => void;
  private _createAnnotation: () => void;
  private _sidebarToggleButton: RefObject<HTMLElement>;

  /**
   * @param container - Element into which the toolbar is rendered
   */
  constructor(container: HTMLElement, options: ToolbarOptions) {
    const { createAnnotation, setSidebarOpen, setHighlightsVisible } = options;

    this._container = container;
    this._useMinimalControls = false;
    this._newAnnotationType = 'note';
    this._highlightsVisible = false;
    this._sidebarOpen = false;

    this._closeSidebar = () => setSidebarOpen(false);
    this._toggleSidebar = () => setSidebarOpen(!this._sidebarOpen);
    this._toggleHighlights = () =>
      setHighlightsVisible(!this._highlightsVisible);
    this._createAnnotation = () => {
      createAnnotation();
      setSidebarOpen(true);
    };

    /** Reference to the sidebar toggle button. */
    this._sidebarToggleButton = createRef<HTMLElement>();

    this.render();
  }

  getWidth() {
    const content = this._container.firstChild as HTMLElement;
    return content.getBoundingClientRect().width;
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
   */
  get sidebarToggleButton() {
    return this._sidebarToggleButton.current as HTMLButtonElement;
  }

  render() {
    render(
      <Toolbar
        closeSidebar={this._closeSidebar}
        createAnnotation={this._createAnnotation}
        newAnnotationType={this._newAnnotationType}
        isSidebarOpen={this._sidebarOpen}
        showHighlights={this._highlightsVisible}
        toggleHighlights={this._toggleHighlights}
        toggleSidebar={this._toggleSidebar}
        toggleSidebarRef={this._sidebarToggleButton}
        useMinimalControls={this.useMinimalControls}
      />,
      this._container,
    );
  }
}
