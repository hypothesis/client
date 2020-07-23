// @ngInject
export default function threadsService(store) {
  /**
   * Make this thread and all of its children "visible". This has the effect of
   * "unhiding" a thread which is currently hidden by an applied search filter
   * (as well as its child threads).
   */
  function forceVisible(thread) {
    thread.children.forEach(child => {
      if (!child.visible) {
        forceVisible(child);
      }
    });
    if (!thread.visible) {
      store.setForcedVisible(thread.id, true);
    }
  }

  return {
    forceVisible,
  };
}
