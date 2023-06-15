import { render } from 'preact';

import type { AnchorPosition, Destroyable } from '../types/annotator';
import Buckets from './components/Buckets';
import { computeBuckets } from './util/buckets';
import { createShadowRoot } from './util/shadow-root';

export type BucketBarOptions = {
  onFocusAnnotations: (tags: string[]) => void;
  onScrollToClosestOffScreenAnchor: (
    tags: string[],
    direction: 'down' | 'up'
  ) => void;
  onSelectAnnotations: (tags: string[], toggle: boolean) => void;
};

/**
 * Controller for the "bucket bar" showing where annotations are in the document.
 *
 * This is usually positioned along the edge of the sidebar but can be
 * rendered elsewhere for certain content viewers.
 */
export class BucketBar implements Destroyable {
  private _bucketsContainer: HTMLElement;
  private _onFocusAnnotations: BucketBarOptions['onFocusAnnotations'];
  private _onScrollToClosestOffScreenAnchor: BucketBarOptions['onScrollToClosestOffScreenAnchor'];
  private _onSelectAnnotations: BucketBarOptions['onSelectAnnotations'];

  constructor(
    container: HTMLElement,
    {
      onFocusAnnotations,
      onScrollToClosestOffScreenAnchor,
      onSelectAnnotations,
    }: BucketBarOptions
  ) {
    this._bucketsContainer = document.createElement('hypothesis-bucket-bar');
    Object.assign(this._bucketsContainer.style, {
      display: 'block',
      flexGrow: '1',

      // The bucket bar uses absolute positioning for the buckets and does not
      // currently have an intrinsic width. This should be revisited so that
      // host pages using a custom bucket bar container don't need to hardcode
      // assumptions about its width.
      width: '100%',
    });

    createShadowRoot(this._bucketsContainer);
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

  update(positions: AnchorPosition[]) {
    const buckets = computeBuckets(positions, this._bucketsContainer);
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
      this._bucketsContainer.shadowRoot!
    );
  }
}
