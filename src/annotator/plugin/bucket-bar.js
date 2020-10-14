import Delegator from '../delegator';
import scrollIntoView from 'scroll-into-view';

import { setHighlightsFocused } from '../highlighter';
import {
  findClosestOffscreenAnchor,
  constructPositionPoints,
  buildBuckets,
} from '../util/buckets';

/**
 * @typedef {import('../util/buckets').Bucket} Bucket
 * @typedef {import('../util/buckets').PositionPoints} PositionPoints
 */

const BUCKET_SIZE = 16; // Regular bucket size
const BUCKET_NAV_SIZE = BUCKET_SIZE + 6; // Bucket plus arrow (up/down)
const BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE; // Toolbar

// Scroll to the next closest anchor off screen in the given direction.
function scrollToClosest(anchors, direction) {
  const closest = findClosestOffscreenAnchor(anchors, direction);
  if (closest && closest.highlights?.length) {
    scrollIntoView(closest.highlights[0]);
  }
}

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

    /** @type {Bucket[]} */
    this.buckets = [];
    /** @type {HTMLElement[]} - Elements created in the bucket bar for each bucket */
    this.tabs = [];

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

  /**
   * Focus or unfocus the anchor highlights in the bucket indicated by `index`
   *
   * @param {number} index - The bucket's index in the `this.buckets` array
   * @param {boolean} toggle - Should this set of highlights be focused (or
   *   un-focused)?
   */
  updateHighlightFocus(index, toggle) {
    if (index > 0 && this.buckets[index] && !this.isNavigationBucket(index)) {
      const bucket = this.buckets[index];
      bucket.anchors.forEach(anchor => {
        setHighlightsFocused(anchor.highlights || [], toggle);
      });
    }
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
    /** @type {PositionPoints} */
    const { above, below, points } = constructPositionPoints(
      this.annotator.anchors
    );

    this.buckets = buildBuckets(points);

    // Add a bucket to the top of the bar that, when clicked, will scroll up
    // to the nearest bucket offscreen above, an upper navigation bucket
    // TODO: This should be part of building the buckets
    this.buckets.unshift(
      { anchors: [], position: 0 },
      { anchors: above, position: BUCKET_TOP_THRESHOLD - 1 },
      { anchors: [], position: BUCKET_TOP_THRESHOLD }
    );

    // Add a bucket to the bottom of the bar that, when clicked, will scroll down
    // to the nearest bucket offscreen below, a lower navigation bucket
    // TODO: This should be part of building the buckets
    this.buckets.push(
      { anchors: [], position: window.innerHeight - BUCKET_NAV_SIZE },
      { anchors: below, position: window.innerHeight - BUCKET_NAV_SIZE + 1 },
      { anchors: [], position: window.innerHeight }
    );

    // The following affordances attempt to reuse existing DOM elements
    // when reconstructing bucket "tabs" to cut down on the number of elements
    // created and added to the DOM

    // Only leave as many "tab" elements attached to the DOM as there are
    // buckets
    this.tabs.slice(this.buckets.length).forEach(tabEl => tabEl.remove());

    // And cut the "tabs" collection down to the size of buckets, too
    /** @type {HTMLElement[]} */
    this.tabs = this.tabs.slice(0, this.buckets.length);

    // If the number of "tabs" currently in the DOM is too small (fewer than
    // buckets), fill that gap by creating new elements (and adding event
    // listeners to them)
    this.buckets.slice(this.tabs.length).forEach(() => {
      const tabEl = document.createElement('div');
      this.tabs.push(tabEl);

      // Note that these elements are reused as buckets change, meaning that
      // any given tab element will correspond to a different bucket over time.
      // However, we know that we have one "tab" per bucket, in order,
      // so we can look up the correct bucket for a tab at event time.

      // Focus and unfocus highlights on mouse events
      tabEl.addEventListener('mousemove', () => {
        this.updateHighlightFocus(this.tabs.indexOf(tabEl), true);
      });

      tabEl.addEventListener('mouseout', () => {
        this.updateHighlightFocus(this.tabs.indexOf(tabEl), false);
      });

      // Select the annotations (in the sidebar)
      // that have anchors within the clicked bucket
      tabEl.addEventListener('click', event => {
        event.stopPropagation();
        const index = this.tabs.indexOf(tabEl);
        const bucket = this.buckets[index];
        if (!bucket) {
          return;
        }
        if (this.isLower(index)) {
          scrollToClosest(bucket.anchors, 'down');
        } else if (this.isUpper(index)) {
          scrollToClosest(bucket.anchors, 'up');
        } else {
          const annotations = bucket.anchors.map(anchor => anchor.annotation);
          this.annotator.selectAnnotations(
            annotations,
            event.ctrlKey || event.metaKey
          );
        }
      });

      this.element.appendChild(tabEl);
    });

    this._buildTabs();
  }

  _buildTabs() {
    this.tabs.forEach((tabEl, index) => {
      let bucketHeight;
      const anchorCount = this.buckets[index].anchors.length;
      // Positioning logic currently _relies_ on their being interstitial
      // buckets that have no anchors but do have positions. Positioning
      // is averaged between this bucket's position and the _next_ bucket's
      // position. For now. TODO: Fix this
      const pos =
        (this.buckets[index].position + this.buckets[index + 1]?.position) / 2;

      tabEl.className = 'annotator-bucket-indicator';
      tabEl.style.top = `${pos}px`;
      tabEl.style.display = '';

      if (anchorCount) {
        tabEl.innerHTML = `<div class="label">${this.buckets[index].anchors.length}</div>`;
        if (anchorCount === 1) {
          tabEl.setAttribute('title', 'Show one annotation');
        } else {
          tabEl.setAttribute('title', `Show ${anchorCount} annotations`);
        }
      } else {
        tabEl.style.display = 'none';
      }

      if (this.isNavigationBucket(index)) {
        bucketHeight = BUCKET_NAV_SIZE;
        tabEl.classList.toggle('upper', this.isUpper(index));
        tabEl.classList.toggle('lower', this.isLower(index));
      } else {
        bucketHeight = BUCKET_SIZE;
        tabEl.classList.remove('upper');
        tabEl.classList.remove('lower');
      }

      tabEl.style.marginTop = (-1 * bucketHeight) / 2 + 'px';
    });
  }

  isUpper(i) {
    return i === 1;
  }

  isLower(i) {
    return i === this.buckets.length - 2;
  }

  isNavigationBucket(i) {
    return this.isUpper(i) || this.isLower(i);
  }
}

// Export constants
BucketBar.BUCKET_SIZE = BUCKET_SIZE;
BucketBar.BUCKET_NAV_SIZE = BUCKET_NAV_SIZE;
BucketBar.BUCKET_TOP_THRESHOLD = BUCKET_TOP_THRESHOLD;
