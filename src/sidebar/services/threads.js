/**
 * @typedef {import('../util/build-thread').Thread} Thread
 */

// @inject
export default function threadsService(store) {
  /**
   * Make this thread and all of its children "visible". This has the effect of
   * "unhiding" a thread which is currently hidden by an applied search filter
   * (as well as its child threads). Only threads that are not currently visible
   * will be forced visible.
   *
   * @param {Thread} thread
   */
  function forceVisible(thread) {
    thread.children.forEach(child => {
      forceVisible(child);
    });
    if (!thread.visible && thread.annotation) {
      store.setForcedVisible(thread.annotation.$tag, true);
    }
  }

  return {
    forceVisible,
  };
}
