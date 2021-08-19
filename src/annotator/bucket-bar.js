import { render } from 'preact';

import { ListenerCollection } from '../shared/listener-collection';

import Buckets from './components/Buckets';
import { anchorBuckets } from './util/buckets';

/**
 * @typedef BucketBarOptions
 * @prop {Element} [contentContainer] - The scrollable container element for the
 *   document content. All of the highlights that the bucket bar's buckets point
 *   at should be contained within this element.
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Subset of the Guest interface used by BucketBar.
 *
 * @typedef {Pick<import('./guest').default, 'anchors'|'contentContainer'|'scrollToAnchor'|'selectAnnotations'>} BucketBarGuest
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
   */
  constructor(container) {
    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._guests = [];
    this._listeners = new ListenerCollection();

    this._listeners.add(window, 'resize', () => this.update());
    this._listeners.add(window, 'scroll', () => this.update());

    // Immediately render the buckets for the current anchors.
    this._update();
  }

  destroy() {
    this._listeners.removeAll();
    this._bucketsContainer.remove();
  }

  update() {
    if (this._updatePending) {
      return;
    }
    this._updatePending = true;
    requestAnimationFrame(() => {
      this._update();
      this._updatePending = false;
    });
  }

  /**
   * Register a new guest with this bucket bar.
   *
   * The position of anchors in the specified guest will be indicated in the
   * bucket bar.
   *
   * @param {BucketBarGuest} guest
   */
  addGuest(guest) {
    this._guests.push(guest);

    const guestContainer = guest.contentContainer();
    this._listeners.add(guestContainer, 'scroll', () => this.update());

    // If this guest belongs to a child iframe, update when that frame scrolls.
    //
    // We already registered observers for the current frame scrolling in the
    // constructor, so we don't need to do that again here.
    const guestFrame = guestContainer.ownerDocument.defaultView;
    if (guestFrame && guestFrame !== window) {
      this._listeners.add(guestFrame, 'scroll', () => this.update());
    }

    this._update();
  }

  _update() {
    const anchors = [];
    for (let guest of this._guests) {
      anchors.push(...guest.anchors);
    }

    const buckets = anchorBuckets(anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(annotations, toggle) =>
          // TODO - Select guest containing this annotation
          this._guests[0].selectAnnotations(annotations, toggle)
        }
        scrollToAnchor={anchor => {
          const guest = this._guests.find(g => g.anchors.includes(anchor));
          guest?.scrollToAnchor(anchor);
        }}
      />,
      this._bucketsContainer
    );
  }
}
