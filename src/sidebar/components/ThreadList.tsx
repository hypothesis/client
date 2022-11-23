import { useEffect, useState } from 'preact/hooks';
import classnames from 'classnames';

import type { Thread } from '../helpers/build-thread';
import { useSidebarStore } from '../store';

import ReplaceWhenOffscreen from './ReplaceWhenOffscreen';
import ThreadCard from './ThreadCard';

export type ThreadListProps = {
  threads: Thread[];
};

/**
 * Render a list of threads.
 *
 * The thread list is "virtualized", meaning that only threads in or near the
 * viewport are rendered. This is critical for performance and memory usage as
 * annotations (and replies) are complex interactive components whose
 * user-defined content may include rich media such as images, audio clips,
 * embedded YouTube videos, rendered math and more.
 */
export default function ThreadList({ threads }: ThreadListProps) {
  // ID of thread to scroll to after the next render. If the thread is not
  // present, the value persists until it can be "consumed".
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  const store = useSidebarStore();

  // Get the `$tag` of the most recently created unsaved annotation.
  const newAnnotationTag = (() => {
    // If multiple unsaved annotations exist, assume that the last one in the
    // list is the most recently created one.
    const newAnnotations = store.unsavedAnnotations();
    if (!newAnnotations.length) {
      return null;
    }
    return newAnnotations[newAnnotations.length - 1].$tag;
  })();

  // Scroll to newly created annotations and replies.
  //
  // nb. If there are multiple unsaved annotations and the newest one is saved
  // or removed, `newAnnotationTag` will revert to the previous unsaved annotation
  // and the thread list will scroll to that.
  useEffect(() => {
    if (newAnnotationTag) {
      store.setForcedVisible(newAnnotationTag, true);
      setScrollToId(newAnnotationTag);
    }
  }, [store, newAnnotationTag]);

  // Effect to scroll a particular thread into view. This is mainly used to
  // scroll a newly created annotation into view.
  useEffect(() => {
    if (!scrollToId) {
      return;
    }

    const element = document.getElementById(scrollToId);
    if (element) {
      element.scrollIntoView();
    }
  }, [scrollToId]);

  return (
    <div>
      {threads.map(child => (
        <div
          className={classnames(
            // The goal is to space out each annotation card vertically. Typically
            // this is better handled by applying vertical spacing to the parent
            // element (e.g. `space-y-3`) but in this case, the constraints of
            // sibling divs before and after the list of annotation cards prevents
            // this, so a bottom margin is added to each card's wrapping element.
            'mb-3'
          )}
          data-testid="thread-card-container"
          id={child.id}
          key={child.id}
        >
          <ReplaceWhenOffscreen defaultHeight={200}>
            <ThreadCard thread={child} />
          </ReplaceWhenOffscreen>
        </div>
      ))}
    </div>
  );
}
