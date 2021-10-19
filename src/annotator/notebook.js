import { TinyEmitter } from 'tiny-emitter';

import { createShadowRoot } from './util/shadow-root';
import { render } from 'preact';
import NotebookModal from './components/NotebookModal';

/** @typedef {import('../types/annotator').Destroyable} Destroyable */

/** @implements Destroyable */
export default class Notebook extends TinyEmitter {
  /**
   * @param {HTMLElement} element
   * @param {Record<string, any>} config
   */
  constructor(element, config = {}) {
    super();

    /**
     * Un-styled shadow host for the notebook content.
     * This isolates the notebook from the page's styles.
     */
    this._outerContainer = document.createElement('hypothesis-notebook');
    element.appendChild(this._outerContainer);
    this.shadowRoot = createShadowRoot(this._outerContainer);

    this._open = false;

    /** @type {string|null} */
    this._groupId = null;

    this._config = config;

    this._update();
  }

  /**
   * Display the notebook application and focus on the given group.
   *
   * @param {string} groupId
   */
  open(groupId) {
    this._open = true;
    this._groupId = groupId;
    this._update();
    this.emit('opened');
  }

  close() {
    this._open = false;
    this._update();
    this.emit('closed');
  }

  isOpen() {
    return this._open;
  }

  destroy() {
    render(null, this.shadowRoot);
    this._outerContainer.remove();
  }

  _update() {
    render(
      <NotebookModal
        config={this._config}
        groupId={this._groupId}
        onClose={() => this.close()}
        open={this._open}
      />,
      this.shadowRoot
    );
  }
}
