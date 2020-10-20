import Delegator from '../delegator';
import scrollIntoView from 'scroll-into-view';

import { setHighlightsFocused } from '../highlighter';
import { findClosestOffscreenAnchor, anchorBuckets } from '../util/buckets';

/**
 * @typedef {import('../util/buckets').Bucket} Bucket
 */

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
    this.buckets = anchorBuckets(this.annotator.anchors);

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
      const anchorCount = this.buckets[index].anchors.length;
      tabEl.className = 'annotator-bucket-indicator';
      tabEl.style.top = `${this.buckets[index].position}px`;
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

      tabEl.classList.toggle('upper', this.isUpper(index));
      tabEl.classList.toggle('lower', this.isLower(index));
    });
  }

  isUpper(i) {
    return i === 0;
  }

  isLower(i) {
    return i === this.buckets.length - 1;
  }

  isNavigationBucket(i) {
    return this.isUpper(i) || this.isLower(i);
  }
}
