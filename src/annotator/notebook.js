import Delegator from './delegator';
import { createSidebarConfig } from './config/sidebar';
import { createShadowRoot } from './util/shadow-root';
import { render } from 'preact';

// FIXME: use the button from the frontend shared package once this is stable.
import Button from '../sidebar/components/Button';

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

    /** @type {null|string} */
    this._groupId = null;
    /** @type {null|string} */
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

    // The overflow CSS property is set to hidden to prevent scrolling of the guest page,
    // while the notebook is shown as modal. It is restored on the close method.
    // I believe this hack only works if this.element points to document.body of the guest page.
    this.originalOverflowStyle = this.element.style.overflow;
    this.element.style.overflow = 'hidden';
  }

  close() {
    if (this.container) {
      this.container.classList.remove('is-open');
      this.container.style.display = 'none';
    }
    this.element.style.overflow = /** @type {string} */ (this
      .originalOverflowStyle);
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

    const close = event => {
      // Guest 'component' captures all click or touchstart events in the host page and opens the sidebar.
      // We stop the propagation of the event to prevent the sidebar to be opened.
      event.stopPropagation();
      this.close();
      this.publish('closeNotebook');
    };

    render(
      <div className="Notebook__controller-bar" onTouchStart={close}>
        <Button
          icon="cancel"
          className="Notebook__close-button"
          buttonText="Close"
          title="Close the Notebook"
          onClick={close}
        />
      </div>,
      this.container
    );

    return this.container;
  }
}
