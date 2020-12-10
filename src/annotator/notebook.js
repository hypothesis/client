import Delegator from './delegator';
import { createSidebarConfig } from './config/sidebar';

/**
 * Create the iframe that will load the notebook application.
 *
 * @return {HTMLIFrameElement}
 */
function createNotebookFrame(config, groupId) {
  const notebookConfig = createSidebarConfig(config);
  // Explicity set the "focused" group
  notebookConfig.group = groupId;
  const configParam =
    'config=' + encodeURIComponent(JSON.stringify(notebookConfig));
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

    this._groupId = null;
    this._prevGroupId = null;

    this.container = document.createElement('div');
    this.container.style.display = 'none';
    this.container.className = 'notebook-outer';

    this.subscribe('showNotebook', groupId => {
      this._groupId = groupId;
      this.show();
    });
    this.subscribe('hideNotebook', () => this.hide());
    // If the sidebar has opened, get out of the way
    this.subscribe('sidebarOpened', () => this.hide());
  }

  _update() {
    // Create a new iFrame if we don't have one at all yet, or if the
    // groupId has changed since last use
    const needIframe =
      !this.frame || !this._prevGroupId || this._prevGroupId !== this._groupId;
    this._prevGroupId = this._groupId;

    if (needIframe) {
      this.frame?.remove();
      this.frame = createNotebookFrame(this.options, this._groupId);
      this.container.appendChild(this.frame);
      this.element.appendChild(this.container);
    }
  }

  show() {
    this._update();
    this.container.classList.add('is-open');
    this.container.style.display = '';
  }

  hide() {
    this.container.classList.remove('is-open');
    this.container.style.display = 'none';
  }

  destroy() {
    this.frame?.remove();
  }
}
