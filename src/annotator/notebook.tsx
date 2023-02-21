import { render } from 'preact';

import type { Destroyable } from '../types/annotator';
import NotebookModal from './components/NotebookModal';
import type { NotebookConfig } from './components/NotebookModal';
import type { EventBus } from './util/emitter';
import { createShadowRoot } from './util/shadow-root';

export class Notebook implements Destroyable {
  private _outerContainer: HTMLElement;
  private _shadowRoot: ShadowRoot;

  /**
   * @param eventBus - Enables communication between components sharing the
   *   same eventBus
   */
  constructor(
    element: HTMLElement,
    eventBus: EventBus,
    config: NotebookConfig
  ) {
    /**
     * Un-styled shadow host for the notebook content.
     * This isolates the notebook from the page's styles.
     */
    this._outerContainer = document.createElement('hypothesis-notebook');
    element.appendChild(this._outerContainer);
    this._shadowRoot = createShadowRoot(this._outerContainer);

    render(
      <NotebookModal eventBus={eventBus} config={config} />,
      this._shadowRoot
    );
  }

  destroy() {
    render(null, this._shadowRoot);
    this._outerContainer.remove();
  }
}
