import { render } from 'preact';

import Buckets from './components/Buckets';
import { computeBuckets } from './util/buckets';

/**
 * @typedef {import('../types/annotator').AnchorPosition} AnchorPosition
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Controller for the "bucket bar" shown alongside the sidebar indicating where
 * annotations are in the document.
 *
 * @implements {Destroyable}
 */
export class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   *   @param {(tags: string[]) => void} options.onFocusAnnotations
   *   @param {(tags: string[], direction: 'down'|'up') => void} options.onScrollToClosestOffScreenAnchor
   *   @param {(tags: string[], toggle: boolean) => void} options.onSelectAnnotations
   */
  constructor(
    container,
    {
      onFocusAnnotations,
      onScrollToClosestOffScreenAnchor,
      onSelectAnnotations,
    }
  ) {
    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._onFocusAnnotations = onFocusAnnotations;
    this._onScrollToClosestOffScreenAnchor = onScrollToClosestOffScreenAnchor;
    this._onSelectAnnotations = onSelectAnnotations;

    // Immediately render the bucket bar
    this.update([]);
  }

  destroy() {
    render(null, this._bucketsContainer);
    this._bucketsContainer.remove();
  }

  /**
   * @param {AnchorPosition[]} positions
   */
  update(positions) {
    const buckets = computeBuckets(positions);
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
