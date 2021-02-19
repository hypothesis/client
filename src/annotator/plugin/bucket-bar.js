import Delegator from '../delegator';

import { render } from 'preact';
import Buckets from '../components/Buckets';

import { anchorBuckets } from '../util/buckets';

/**
 * @typedef RegisteredListener
 * @prop {Window|HTMLElement} eventTarget
 * @prop {string} eventType
 * @prop {(event: any) => void} listener
 */

export default class BucketBar extends Delegator {
  constructor(element, options, annotator) {
    const defaultOptions = {
      // Selectors for the scrollable elements on the page
      /** @type {string[]} */
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

    /** @type {RegisteredListener[]} */
    this.registeredListeners = [];

    this._registerEvent(window, 'resize', () => this.update());
    this._registerEvent(window, 'scroll', () => this.update());
    this.options.scrollables
      .map((/** @type {string} */ selector) => document.querySelector(selector))
      .filter(Boolean)
      .map(scrollableElement =>
        this._registerEvent(scrollableElement, 'scroll', () => this.update())
      );
  }

  destroy() {
    this._unregisterEvents();
  }

  /**
   * @param {Window|HTMLElement} eventTarget
   * @param {string} eventType
   * @param {(event: any) => void} listener
   */
  _registerEvent(eventTarget, eventType, listener) {
    eventTarget.addEventListener(eventType, listener);
    this.registeredListeners.push({ eventTarget, eventType, listener });
  }

  _unregisterEvents() {
    this.registeredListeners.forEach(({ eventTarget, eventType, listener }) => {
      eventTarget.removeEventListener(eventType, listener);
    });
    this.registeredListeners = [];
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
