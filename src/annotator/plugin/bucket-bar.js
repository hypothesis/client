import Delegator from '../delegator';

import { render } from 'preact';
import Buckets from '../components/Buckets';

import { anchorBuckets } from '../util/buckets';

export default class BucketBar extends Delegator {
  constructor(container, options, annotator) {
    const defaultOptions = {
      // Selectors for the scrollable elements on the page
      scrollables: [],
    };

    const opts = { ...defaultOptions, ...options };

    const el = document.createElement('div');
    el.className = 'annotator-bucket-bar';
    super(el, opts);

    this.annotator = annotator;
    container.appendChild(this.element);

    this.updateFunc = () => this.update();

    window.addEventListener('resize', this.updateFunc);
    window.addEventListener('scroll', this.updateFunc);
    this.options.scrollables.forEach(scrollable => {
      const scrollableElement = /** @type {HTMLElement | null} */ (document.querySelector(
        scrollable
      ));
      scrollableElement?.addEventListener('scroll', this.updateFunc);
    });
  }

  destroy() {
    window.removeEventListener('resize', this.updateFunc);
    window.removeEventListener('scroll', this.updateFunc);
    this.options.scrollables.forEach(scrollable => {
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
    const buckets = anchorBuckets(this.annotator.anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(annotations, toggle) =>
          this.annotator.selectAnnotations(annotations, toggle)
        }
      />,
      this.element
    );
  }
}
