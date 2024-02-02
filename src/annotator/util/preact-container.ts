import type { ComponentChild } from 'preact';
import { render } from 'preact';

import type { Destroyable } from '../../types/annotator';
import { createShadowRoot } from './shadow-root';

/**
 * Manages the root `<hypothesis-*>` container for a top-level Hypothesis UI
 * element.
 *
 * This implements common functionality for these elements, such as:
 *
 *  - Creating the `<hypothesis-{name}>` element with a shadow root, and loading
 *    stylesheets into it.
 *  - Re-rendering the Preact component tree when {@link PreactContainer.render} is called.
 *  - Unmounting the component and removing the container element when
 *    {@link PreactContainer.destroy} is called
 */
export class PreactContainer implements Destroyable {
  private _element: HTMLElement;
  private _shadowRoot: ShadowRoot;
  private _render: () => ComponentChild;

  /**
   * Create a new `<hypothesis-{name}>` container element.
   *
   * After constructing the container, {@link PreactContainer.render} should be
   * called to perform the initial render.
   *
   * @param name - Suffix for the element
   * @param render - Callback that renders the root JSX element for this container
   */
  constructor(name: string, render: () => ComponentChild) {
    const tag = `hypothesis-${name}`;
    this._element = document.createElement(tag);
    this._shadowRoot = createShadowRoot(this._element);
    this._render = render;
  }

  /** Unmount the Preact component and remove the container element from the DOM. */
  destroy() {
    render(null, this._shadowRoot);
    this._element.remove();
  }

  /** Return a reference to the container element. */
  get element(): HTMLElement {
    return this._element;
  }

  /** Re-render the root Preact component. */
  render() {
    render(this._render(), this._shadowRoot);
  }
}
