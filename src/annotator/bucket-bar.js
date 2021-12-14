import { render } from 'preact';

import { ListenerCollection } from '../shared/listener-collection';

import Buckets from './components/Buckets';

/**
 * @typedef BucketBarOptions
 * @prop {Element} [contentContainer] - The scrollable container element for the
 *   document content. All of the highlights that the bucket bar's buckets point
 *   at should be contained within this element.
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Controller for the "bucket bar" shown alongside the sidebar indicating where
 * annotations are in the document.
 *
 * @implements Destroyable
 */
export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {BucketBarOptions} [options]
   */
  constructor(container, { contentContainer = document.body } = {}) {
    this._contentContainer = contentContainer;

    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._listeners = new ListenerCollection();
    this._listeners.add(contentContainer, 'scroll', () => this.update());
  }

  destroy() {
    this._listeners.removeAll();
    this._bucketsContainer.remove();
  }

  update({ above, below, buckets }) {
    render(
      <Buckets
        above={above}
        below={below}
        buckets={buckets}
        onSelectAnnotations={(tags, toggle) => {
          // TODO
          //this._guest.selectAnnotations(annotations, toggle)
        }}
        scrollToAnchor={tag => {
          // TODO
          //this._guest.scrollToAnchor(anchor)
        }}
      />,
      this._bucketsContainer
    );
  }
}
