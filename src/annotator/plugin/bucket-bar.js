import Delegator from '../delegator';

import { createElement, render } from 'preact';
import Buckets from '../components/buckets';

import { anchorBuckets } from '../util/buckets';

export default class BucketBar extends Delegator {
  constructor(element, options, annotator) {
    const defaultOptions = {
      // Selectors for the scrollable elements on the page
      scrollables: [],
    };

    const opts = { ...defaultOptions, ...options };

    const el = document.createElement('div');
    el.className = 'annotator-bucket-bar';
    super(el, opts);

    this.annotator = annotator;

    // The element to append this plugin's element to; defaults to the provided
    // `element` unless a `container` option was provided
    let container = /** @type {HTMLElement} */ (element);

    if (this.options.container) {
      // If a container element selector has been provided, and there is an
      // element corresponding to that container — use it
      const containerEl = /** @type {HTMLElement | null } */ (document.querySelector(
        this.options.container
      ));
      if (containerEl) {
        container = containerEl;
      } else {
        // A container selector has been supplied, but it didn't pan out...
        console.warn(
          `Unable to find container element for selector '${this.options.container}'`
        );
      }
    }
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
