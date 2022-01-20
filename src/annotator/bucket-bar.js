import { render } from 'preact';

import Buckets from './components/Buckets';
import { anchorBuckets } from './util/buckets';

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Controller for the "bucket bar" shown alongside the sidebar indicating where
 * annotations are in the document.
 *
 * @implements {Destroyable}
 */
export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {Pick<import('./guest').default, 'anchors'|'scrollToAnchor'>} guest
   * @param {object} options
   *   @param {(tags: string[], toggle: boolean) => void} options.onSelectAnnotations
   */
  constructor(container, guest, { onSelectAnnotations }) {
    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._guest = guest;
    this._onSelectAnnotations = onSelectAnnotations;

    // Immediately render the buckets for the current anchors.
    this.update();
  }

  destroy() {
    render(null, this._bucketsContainer);
    this._bucketsContainer.remove();
  }

  update() {
    const buckets = anchorBuckets(this._guest.anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(tags, toogle) =>
          this._onSelectAnnotations(tags, toogle)
        }
        scrollToAnchor={anchor => this._guest.scrollToAnchor(anchor)}
      />,
      this._bucketsContainer
    );
  }
}
