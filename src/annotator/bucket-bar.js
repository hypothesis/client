import { render } from 'preact';
import Buckets from './components/Buckets';

import { anchorBuckets } from './util/buckets';

/**
 * @typedef BucketBarOptions
 * @prop {Element} [contentContainer] - The scrollable container element for the
 *   highlights that the bucket bar's buckets will point at
 */

export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {Pick<import('./guest').default, 'anchors'|'selectAnnotations'>} guest
   * @param {BucketBarOptions} [options]
   */
  constructor(container, guest, { contentContainer = document.body } = {}) {
    this._contentContainer = contentContainer;
    this.element = document.createElement('div');

    this.guest = guest;
    container.appendChild(this.element);

    this.updateFunc = () => this.update();

    window.addEventListener('resize', this.updateFunc);
    window.addEventListener('scroll', this.updateFunc);
    contentContainer.addEventListener('scroll', this.updateFunc);

    // Immediately render the buckets for the current anchors.
    this._update();
  }

  destroy() {
    window.removeEventListener('resize', this.updateFunc);
    window.removeEventListener('scroll', this.updateFunc);
    this._contentContainer.removeEventListener('scroll', this.updateFunc);
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

  _update() {
    const buckets = anchorBuckets(this.guest.anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(annotations, toggle) =>
          this.guest.selectAnnotations(annotations, toggle)
        }
      />,
      this.element
    );
  }
}
