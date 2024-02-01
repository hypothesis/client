import type { AnchorPosition, Destroyable } from '../types/annotator';
import Buckets from './components/Buckets';
import { computeBuckets } from './util/buckets';
import { PreactContainer } from './util/preact-container';

export type BucketBarOptions = {
  onFocusAnnotations: (tags: string[]) => void;
  onScrollToAnnotation: (tag: string) => void;
  onSelectAnnotations: (tags: string[], toggle: boolean) => void;
};

/**
 * Controller for the "bucket bar" showing where annotations are in the document.
 *
 * This is usually positioned along the edge of the sidebar but can be
 * rendered elsewhere for certain content viewers.
 */
export class BucketBar implements Destroyable {
  private _container: PreactContainer;
  private _positions: AnchorPosition[];
  private _onFocusAnnotations: BucketBarOptions['onFocusAnnotations'];
  private _onScrollToAnnotation: BucketBarOptions['onScrollToAnnotation'];
  private _onSelectAnnotations: BucketBarOptions['onSelectAnnotations'];

  constructor(
    container: HTMLElement,
    {
      onFocusAnnotations,
      onScrollToAnnotation,
      onSelectAnnotations,
    }: BucketBarOptions,
  ) {
    this._positions = [];
    this._container = new PreactContainer('bucket-bar', () => this._render());
    Object.assign(this._container.element.style, {
      display: 'block',
      flexGrow: '1',

      // The bucket bar uses absolute positioning for the buckets and does not
      // currently have an intrinsic width. This should be revisited so that
      // host pages using a custom bucket bar container don't need to hardcode
      // assumptions about its width.
      width: '100%',
    });

    container.appendChild(this._container.element);
    this._onFocusAnnotations = onFocusAnnotations;
    this._onScrollToAnnotation = onScrollToAnnotation;
    this._onSelectAnnotations = onSelectAnnotations;

    this._container.render();
  }

  destroy() {
    this._container.destroy();
  }

  /** Update the set of anchors from which buckets are generated. */
  update(positions: AnchorPosition[]) {
    this._positions = positions;
    this._container.render();
  }

  private _render() {
    const buckets = computeBuckets(this._positions, this._container.element);
    return (
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onFocusAnnotations={tags => this._onFocusAnnotations(tags)}
        onScrollToAnnotation={tag => this._onScrollToAnnotation(tag)}
        onSelectAnnotations={(tags, toogle) =>
          this._onSelectAnnotations(tags, toogle)
        }
      />
    );
  }
}
