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
 * @implements Destroyable
 */
export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {Pick<import('./guest').default, 'anchors'|'scrollToAnchor'|'selectAnnotations'>} guest
   */
  constructor(container, guest) {
    this._bucketBar = document.createElement('bucket-bar');
    container.appendChild(this._bucketBar);

    this._guest = guest;

    // Immediately render the buckets for the current anchors.
    this.update();
  }

  destroy() {
    render(null, this._bucketBar);
    this._bucketBar.remove();
  }

  update() {
    const buckets = anchorBuckets(this._guest.anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(annotations, toggle) =>
          this._guest.selectAnnotations(annotations, toggle)
        }
        scrollToAnchor={anchor => this._guest.scrollToAnchor(anchor)}
      />,
      this._bucketBar
    );
  }
}
