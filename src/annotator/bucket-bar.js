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
   * @param {Pick<import('./guest').default, 'anchors'>} guest
   * @param {object} options
   *   @param {(tags: string[]) => void} options.onFocusAnnotations
   *   @param {(tags: string[], direction: 'down'|'up') => void} options.onScrollToClosestOffScreenAnchor
   *   @param {(tags: string[], toggle: boolean) => void} options.onSelectAnnotations
   */
  constructor(
    container,
    guest,
    {
      onFocusAnnotations,
      onScrollToClosestOffScreenAnchor,
      onSelectAnnotations,
    }
  ) {
    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._guest = guest;
    this._onFocusAnnotations = onFocusAnnotations;
    this._onScrollToClosestOffScreenAnchor = onScrollToClosestOffScreenAnchor;
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
        onFocusAnnotations={tags => this._onFocusAnnotations(tags)}
        onScrollToClosestOffScreenAnchor={(tags, direction) =>
          this._onScrollToClosestOffScreenAnchor(tags, direction)
        }
        onSelectAnnotations={(tags, toogle) =>
          this._onSelectAnnotations(tags, toogle)
        }
      />,
      this._bucketsContainer
    );
  }
}
