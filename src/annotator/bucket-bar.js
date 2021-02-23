import { render } from 'preact';
import Buckets from './components/Buckets';

import { anchorBuckets } from './util/buckets';

/**
 * @typedef BucketBarOptions
 * @prop {string[]} [scrollables] - Selectors for the scrollable elements on the page
 */

export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {Pick<import('./guest').default, 'anchors'|'selectAnnotations'>} guest
   * @param {BucketBarOptions} [options]
   */
  constructor(container, guest, options = {}) {
    this.options = options;
    this.element = document.createElement('div');

    this.guest = guest;
    container.appendChild(this.element);

    this.updateFunc = () => this.update();

    window.addEventListener('resize', this.updateFunc);
    window.addEventListener('scroll', this.updateFunc);
    this.options.scrollables?.forEach(scrollable => {
      const scrollableElement = /** @type {HTMLElement | null} */ (document.querySelector(
        scrollable
      ));
      scrollableElement?.addEventListener('scroll', this.updateFunc);
    });
  }

  destroy() {
    window.removeEventListener('resize', this.updateFunc);
    window.removeEventListener('scroll', this.updateFunc);
    this.options.scrollables?.forEach(scrollable => {
      const scrollableElement = /** @type {HTMLElement | null} */ (document.querySelector(
        scrollable
      ));
      scrollableElement?.removeEventListener('scroll', this.updateFunc);
    });
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
