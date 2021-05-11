import { createElement, createRef, render } from 'preact';

import Toolbar from './components/toolbar';

/**
 * @typedef ToolbarOptions
 * @prop {() => any} createAnnotation
 * @prop {(open: boolean) => any} setSidebarOpen
 * @prop {(visible: boolean) => any} setHighlightsVisible
 * @prop {(doodleable: boolean) => any} setUserCanDoodle
 * @prop {(doodleable: boolean) => any} setDoodleOptions
 * @prop {() => any} saveDoodle
 */

/**
 * Controller for the toolbar on the edge of the sidebar.
 *
 * This toolbar provides controls for opening and closing the sidebar, toggling
 * highlight visibility etc.
 */
export class ToolbarController {
  /**
   * @param {HTMLElement} container - Element into which the toolbar is rendered
   * @param {ToolbarOptions} options
   */
  constructor(container, options) {
    const {
      createAnnotation,
      setSidebarOpen,
      setHighlightsVisible,
      setUserCanDoodle,
      setDoodleOptions,
      saveDoodle,
    } = options;

    this._container = container;
    this._container.className = 'annotator-toolbar';

    this._useMinimalControls = false;

    this._drawingToolbar = false;

    /** @type {'annotation'|'note'} */
    this._newAnnotationType = 'note';

    this._highlightsVisible = false;
    this._sidebarOpen = false;
    this._doodleable = false;

    this._closeSidebar = () => setSidebarOpen(false);
    this._toggleSidebar = () => setSidebarOpen(!this._sidebarOpen);
    this._toggleHighlights = () =>
      setHighlightsVisible(!this._highlightsVisible);
    this._toggleDoodleToolbar = () => {
      this._drawingToolbar = !this._drawingToolbar;
      this._doodleable = this._drawingToolbar;
      setUserCanDoodle(this._doodleable);
      this.render();
    };
    this._setDoodleOptions = options => {
      setDoodleOptions(options);
    };
    this._createAnnotation = () => {
      createAnnotation();
      setSidebarOpen(true);
    };
    this._saveDoodle = () => {
      saveDoodle();
    };

    /** Reference to the sidebar toggle button. */
    this._sidebarToggleButton = createRef();

    this.render();
  }

  getWidth() {
    return this._container.getBoundingClientRect().width;
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
   * @type {HTMLButtonElement}
   */
  get sidebarToggleButton() {
    return this._sidebarToggleButton.current;
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
        setDoodleOptions={this._setDoodleOptions}
        drawingToolbarActivated={this._drawingToolbar}
        drawingToolbarToggle={this._toggleDoodleToolbar}
        saveDoodle={this._saveDoodle}
      />,
      this._container
    );
  }
}
