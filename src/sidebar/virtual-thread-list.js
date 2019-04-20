'use strict';

const EventEmitter = require('tiny-emitter');
const debounce = require('lodash.debounce');

/**
 * @typedef Options
 * @property {Function} [invisibleThreadFilter] - Function used to determine
 *   whether an off-screen thread should be rendered or not.  Called with a
 *   `Thread` and if it returns `true`, the thread is rendered even if offscreen.
 * @property {Element} [scrollRoot] - The scrollable Element which contains the
 *   thread list. The set of on-screen threads is determined based on the scroll
 *   position and height of this element.
 */

/**
 * VirtualThreadList is a helper for virtualizing the annotation thread list.
 *
 * 'Virtualizing' the thread list improves UI performance by only creating
 * annotation cards for annotations which are either in or near the viewport.
 *
 * Reducing the number of annotation cards that are actually created optimizes
 * the initial population of the list, since annotation cards are big components
 * that are expensive to create and consume a lot of memory. For Angular
 * applications this also helps significantly with UI responsiveness by limiting
 * the number of watchers (functions created by template expressions or
 * '$scope.$watch' calls) that have to be run on every '$scope.$digest()' cycle.
 */
class VirtualThreadList extends EventEmitter {
  /*
   * @param {Window} container - The Window displaying the list of annotation threads.
   * @param {Thread} rootThread - The initial Thread object for the top-level
   *        threads.
   * @param {Options} options
   */
  constructor($scope, window_, rootThread, options) {
    super();

    const self = this;

    this._rootThread = rootThread;

    this._options = Object.assign({}, options);

    // Cache of thread ID -> last-seen height
    this._heights = {};

    this.window = window_;
    this.scrollRoot = options.scrollRoot || document.body;

    const debouncedUpdate = debounce(function() {
      self.calculateVisibleThreads();
      $scope.$digest();
    }, 20);
    this.scrollRoot.addEventListener('scroll', debouncedUpdate);
    this.window.addEventListener('resize', debouncedUpdate);

    this._detach = function() {
      this.scrollRoot.removeEventListener('scroll', debouncedUpdate);
      this.window.removeEventListener('resize', debouncedUpdate);
    };
  }

  /**
   * Detach event listeners and clear any pending timeouts.
   *
   * This should be invoked when the UI view presenting the virtual thread list
   * is torn down.
   */
  detach() {
    this._detach();
  }

  /**
   * Sets the root thread containing all conversations matching the current
   * filters.
   *
   * This should be called with the current Thread object whenever the set of
   * matching annotations changes.
   */
  setRootThread(thread) {
    if (thread === this._rootThread) {
      return;
    }
    this._rootThread = thread;
    this.calculateVisibleThreads();
  }

  /**
   * Sets the actual height for a thread.
   *
   * When calculating the amount of space required for offscreen threads,
   * the actual or 'last-seen' height is used if known. Otherwise an estimate
   * is used.
   *
   * @param {string} id - The annotation ID or $tag
   * @param {number} height - The height of the annotation thread.
   */
  setThreadHeight(id, height) {
    if (isNaN(height) || height <= 0) {
      throw new Error('Invalid thread height %d', height);
    }
    this._heights[id] = height;
  }

  _height(id) {
    // Default guess of the height required for a threads that have not been
    // measured
    const DEFAULT_HEIGHT = 200;
    return this._heights[id] || DEFAULT_HEIGHT;
  }

  /** Return the vertical offset of an annotation card from the top of the list. */
  yOffsetOf(id) {
    const self = this;
    const allThreads = this._rootThread.children;
    const matchIndex = allThreads.findIndex(function(thread) {
      return thread.id === id;
    });
    if (matchIndex === -1) {
      return 0;
    }
    return allThreads.slice(0, matchIndex).reduce(function(offset, thread) {
      return offset + self._height(thread.id);
    }, 0);
  }

  /**
   * Recalculates the set of visible threads and estimates of the amount of space
   * required for offscreen threads above and below the viewport.
   *
   * Emits a `changed` event with the recalculated set of visible threads.
   */
  calculateVisibleThreads() {
    // Space above the viewport in pixels which should be considered 'on-screen'
    // when calculating the set of visible threads
    const MARGIN_ABOVE = 800;
    // Same as MARGIN_ABOVE but for the space below the viewport
    const MARGIN_BELOW = 800;

    // Estimated height in pixels of annotation cards which are below the
    // viewport and not actually created. This is used to create an empty spacer
    // element below visible cards in order to give the list's scrollbar the
    // correct dimensions.
    let offscreenLowerHeight = 0;
    // Same as offscreenLowerHeight but for cards above the viewport.
    let offscreenUpperHeight = 0;
    // List of annotations which are in or near the viewport and need to
    // actually be created.
    const visibleThreads = [];

    // List of annotations which are required to be rendered but we do not
    // want them visible. This is to ensure that we allow items to be rendered
    // and initialized (for saving purposes) without having them be presented
    // in out of context scenarios (i.e. in wrong order for sort)
    const invisibleThreads = [];

    const allThreads = this._rootThread.children;
    const visibleHeight = this.window.innerHeight;
    let usedHeight = 0;
    let thread;

    for (let i = 0; i < allThreads.length; i++) {
      thread = allThreads[i];
      const threadHeight = this._height(thread.id);

      let added = false;

      if (
        usedHeight + threadHeight <
        this.scrollRoot.scrollTop - MARGIN_ABOVE
      ) {
        // Thread is above viewport
        offscreenUpperHeight += threadHeight;
      } else if (
        usedHeight <
        this.scrollRoot.scrollTop + visibleHeight + MARGIN_BELOW
      ) {
        // Thread is either in or close to the viewport
        visibleThreads.push(thread);
        added = true;
      } else {
        // Thread is below viewport
        offscreenLowerHeight += threadHeight;
      }

      // any thread that is not going to go through the render process
      // because it is already outside of the viewport should be checked
      // to see if it needs to be added as an invisible render. So it will
      // be available to go through rendering but not visible to the user
      if (
        !added &&
        this._options.invisibleThreadFilter &&
        this._options.invisibleThreadFilter(thread)
      ) {
        invisibleThreads.push(thread);
      }

      usedHeight += threadHeight;
    }

    this.emit('changed', {
      offscreenLowerHeight: offscreenLowerHeight,
      offscreenUpperHeight: offscreenUpperHeight,
      visibleThreads: visibleThreads,
      invisibleThreads: invisibleThreads,
    });
    return {
      offscreenLowerHeight,
      offscreenUpperHeight,
      visibleThreads,
      invisibleThreads,
    };
  }
}

module.exports = VirtualThreadList;
