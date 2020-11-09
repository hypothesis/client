import Delegator from './delegator';
import { createSidebarConfig } from './config/sidebar';

/**
 * Create the iframe that will load the sidebar application.
 *
 * @return {HTMLIFrameElement}
 */
function createNotebookFrame(config) {
  const sidebarConfig = createSidebarConfig(config);
  const configParam =
    'config=' + encodeURIComponent(JSON.stringify(sidebarConfig));
  const notebookAppSrc = config.notebookAppUrl + '#' + configParam;

  const notebookFrame = document.createElement('iframe');

  // Enable media in annotations to be shown fullscreen
  notebookFrame.setAttribute('allowfullscreen', '');

  notebookFrame.src = notebookAppSrc;
  notebookFrame.title = 'Hypothesis annotation notebook';
  notebookFrame.className = 'notebook-inner';

  return notebookFrame;
}

export default class Notebook extends Delegator {
  constructor(element, config) {
    super(element, config);
    this.frame = null;
    // TODO?: handle external container?

    this.container = document.createElement('div');
    this.container.style.display = 'none';
    // TODO?: Is there any necessity to handle theme-clean?
    this.container.className = 'notebook-outer';

    this.subscribe('showNotebook', () => this.show());
    this.subscribe('hideNotebook', () => this.hide());
    // If the sidebar has opened, get out of the way
    this.subscribe('sidebarOpened', () => this.hide());
  }

  init() {
    if (!this.frame) {
      this.frame = createNotebookFrame(this.options);
      this.container.appendChild(this.frame);
      this.element.appendChild(this.container);
    }
  }

  show() {
    this.init();
    this.container.style.display = '';
  }

  hide() {
    this.container.style.display = 'none';
  }

  destroy() {
    // TBD
    return;
  }
}
