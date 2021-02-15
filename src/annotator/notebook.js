import Delegator from './delegator';
import { createSidebarConfig } from './config/sidebar';
import { createShadowRoot } from './util/shadow-root';
import { render } from 'preact';

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

    /**
     * Un-styled shadow host for the notebook content.
     *
     * This isolates the notebook from the page's styles.
     */
    this._outerContainer = document.createElement('hypothesis-notebook');
    this.element.appendChild(this._outerContainer);

    /**
     * Lazily-initialized container for the notebook iframe. This is only created
     * when the notebook is actually used.
     *
     * @type {HTMLElement|null}
     */
    this.container = null;

    this.subscribe('openNotebook', groupId => {
      this._groupId = groupId;
      this.open();
    });
    this.subscribe('closeNotebook', () => this.close());
    // If the sidebar has opened, get out of the way
    this.subscribe('sidebarOpened', () => this.close());
  }

  _update() {
    const container = this._initContainer();

    // Create a new iFrame if we don't have one at all yet, or if the
    // groupId has changed since last use
    const needIframe =
      !this.frame || !this._prevGroupId || this._prevGroupId !== this._groupId;
    this._prevGroupId = this._groupId;

    if (needIframe) {
      this.frame?.remove();
      this.frame = createNotebookFrame(this.options, this._groupId);
      container.appendChild(this.frame);
    }
  }

  open() {
    const container = this._initContainer();
    this._update();
    container.classList.add('is-open');
    container.style.display = '';
  }

  close() {
    if (this.container) {
      this.container.classList.remove('is-open');
      this.container.style.display = 'none';
    }
  }

  destroy() {
    this._outerContainer.remove();
  }

  _initContainer() {
    if (this.container) {
      return this.container;
    }

    const shadowRoot = createShadowRoot(this._outerContainer);
    this.container = document.createElement('div');
    this.container.style.display = 'none';
    this.container.className = 'notebook-outer';
    shadowRoot.appendChild(this.container);

    return this.container;
  }
}
