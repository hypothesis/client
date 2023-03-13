import { hasOwn } from '../../shared/has-own';
import type { Annotation } from '../../types/api';

export type Thread = {
  /**
   * The thread's id, which equivalent to the id of its annotation. For unsaved
   * annotations, the id is derived from the annotation's local `$tag` property.
   */
  id: string;

  /**
   * This thread's annotation. Undefined in cases when an annotation _should_
   * exist—it's implied by a reference from another annotation—but is not
   * present in our collection of annotations.
   * This can happen when a reply has been deleted, but still has children that
   * exist.
   */
  annotation?: Annotation;

  /** The id of this thread's parent. Top-level threads do not have parents */
  parent?: string;

  /**
   * Whether this thread should be visible when rendered. true when the thread's
   * annotation matches current annotation filters.
   */
  visible: boolean;

  /**
   * Whether the replies in this thread should be rendered as collapsed
   * (when true) or expanded (when false).
   */
  collapsed: boolean;

  children: Thread[];

  /** Computed count of all replies to a thread */
  replyCount: number;

  /** The thread's depth in the hierarchy */
  depth: number;
};

/**
 * Default state for new threads
 */
const DEFAULT_THREAD_STATE = {
  collapsed: false,
  depth: 0,
  visible: true,
  replyCount: 0,
};

/**
 * Returns a persistent identifier for an Annotation.
 * If the Annotation has been created on the server, it will have
 * an id assigned, otherwise we fall back to the local-only '$tag'
 * property.
 */
function annotationId(annotation: Annotation): string {
  return annotation.id || annotation.$tag;
}

/**
 * Is there a valid path from the thread indicated by `id` to the root thread,
 * with no circular references?
 *
 * @param id - The id of the thread to be verified
 * @param ancestorId - The ancestor of the thread indicated by id that is to be
 *        verified: is it extant and not a circular reference?
 */
function hasPathToRoot(
  threads: Record<string, Thread>,
  id: string,
  ancestorId: string
): boolean {
  const ancestor = threads[ancestorId];
  if (!ancestor || ancestor.parent === id) {
    // Thread for ancestor not found, or points at itself: circular reference
    return false;
  } else if (!ancestor.parent) {
    // Top of the tree: we've made it
    return true;
  }
  return hasPathToRoot(threads, id, ancestor.parent);
}

/**
 * Link the thread's annotation to its parent
 * @param parents - ids of parent annotations, from the annotation's
 *        `references` field. Immediate parent is last entry.
 */
function setParent(
  threads: Record<string, Thread>,
  id: string,
  parents: string[] = []
) {
  if (threads[id].parent || !parents.length) {
    // Parent already assigned, do not try to change it.
    return;
  }
  const parentId = parents[parents.length - 1];

  if (!threads[parentId]) {
    // Parent does not exist. This may be a reply to an annotation which has
    // been deleted. Create a placeholder Thread with no annotation to
    // represent the missing annotation.
    threads[parentId] = {
      ...DEFAULT_THREAD_STATE,
      children: [],
      id: parentId,
    };
    // Link up this new thread to _its_ parent, which should be the original
    // thread's grandparent
    setParent(threads, parentId, parents.slice(0, -1));
  }

  if (hasPathToRoot(threads, id, parentId)) {
    threads[id].parent = parentId;
    threads[parentId].children.push(threads[id]);
  }
}

/**
 * Creates a thread tree of annotations from a list of annotations.
 *
 * Given a flat list of annotations and replies, this generates a hierarchical
 * thread, using the `references` field of an annotation to link together
 * annotations and their replies. The `references` field is a possibly
 * incomplete ordered list of the parents of an annotation, from furthest to
 * nearest ancestor.
 *
 * @param annotations - The input annotations to thread.
 * @return The input annotations threaded into a tree structure.
 */
function threadAnnotations(annotations: Annotation[]): Thread {
  const threads: Record<string, Thread> = {};

  // Create a `Thread` for each annotation
  annotations.forEach(annotation => {
    const id = annotationId(annotation);
    threads[id] = {
      ...DEFAULT_THREAD_STATE,
      children: [],
      annotation,
      id,
    };
  });

  // Establish ancestral relationships between annotations
  annotations.forEach(annotation => {
    // Remove references to self from `references` to avoid circular references
    const parents = (annotation.references || []).filter(
      id => id !== annotation.id
    );
    return setParent(threads, annotationId(annotation), parents);
  });

  // Collect the set of threads which have no parent as
  // children of the thread root
  const rootThreads = [];
  for (const rootThreadId in threads) {
    if (!threads[rootThreadId].parent) {
      // Top-level threads are collapsed by default
      threads[rootThreadId].collapsed = true;
      rootThreads.push(threads[rootThreadId]);
    }
  }

  const rootThread = {
    ...DEFAULT_THREAD_STATE,
    id: 'root',
    children: rootThreads,
  };

  return rootThread;
}

/**
 * Returns a copy of `thread` with the thread
 * and each of its children transformed by mapFn(thread).
 */
function mapThread(thread: Thread, mapFn: (t: Thread) => Thread): Thread {
  return Object.assign({}, mapFn(thread), {
    children: thread.children.map(child => {
      return mapThread(child, mapFn);
    }),
  });
}

/**
 * Return a new `Thread` object with all (recursive) `children` arrays sorted.
 * Sort the children of top-level threads using `compareFn` and all other
 * children using `replyCompareFn`.
 *
 * @param compareFn - comparison function for sorting top-level annotations
 * @param replyCompareFn - comparison function for sorting replies
 */
function sortThread(
  thread: Thread,
  compareFn: (a: Thread, b: Thread) => number,
  replyCompareFn: (a: Thread, b: Thread) => number
): Thread {
  const children = thread.children.map(child =>
    sortThread(child, replyCompareFn, replyCompareFn)
  );

  const sortedChildren = children.slice().sort(compareFn);

  return { ...thread, children: sortedChildren };
}

/**
 * Return a copy of `thread` with the `replyCount` and `depth` properties
 * updated.
 */
function countRepliesAndDepth(thread: Thread, depth: number): Thread {
  const children = thread.children.map(c => countRepliesAndDepth(c, depth + 1));
  const replyCount = children.reduce(
    (total, child) => total + 1 + child.replyCount,
    0
  );
  return {
    ...thread,
    children,
    depth,
    replyCount,
  };
}

/**
 * Does this thread have any visible children?
 */
function hasVisibleChildren(thread: Thread): boolean {
  return thread.children.some(child => {
    return child.visible || hasVisibleChildren(child);
  });
}

export type BuildThreadOptions = {
  /** Map of thread id => expansion state */
  expanded: Record<string, boolean>;

  /**
   * List of $tags of annotations that have been explicitly expanded by the
   * user, even if they don't match current filters
   */
  forcedVisible: string[];

  /** List of currently-selected annotation ids, from the data store */
  selected: string[];

  /** Comparison function for sorting top-level annotations */
  sortCompareFn: (a: Thread, b: Thread) => number;

  /** Predicate function that returns `true` if annotation should be visible */
  filterFn?: (a: Annotation) => boolean;

  /**
   * Predicate function that returns `true` if the annotation should be included
   * in the thread tree
   */
  threadFilterFn?: (t: Thread) => boolean;
};

/**
 * Sort by reply (Annotation) `created` date
 */
const replySortCompareFn = (a: Thread, b: Thread): number => {
  if (!a.annotation || !b.annotation) {
    return 0;
  }
  if (a.annotation.created < b.annotation.created) {
    return -1;
  } else if (a.annotation.created > b.annotation.created) {
    return 1;
  }
  return 0;
};

/**
 * Project, filter and sort a list of annotations into a thread structure for
 * display by the <Thread> component.
 *
 * buildThread() takes as inputs a flat list of annotations,
 * the current visibility filters and sort function and returns
 * the thread structure that should be rendered.
 *
 * An Annotation present in `annotations` will not be present in the returned threads if:
 * - The annotation does not match thread-level filters (options.threadFilterFn), OR
 * - The annotation is not in the current selection (options.selected), OR
 * - The annotation's thread is hidden and has no visible children
 *
 * Annotations that do not match the currently-applied annotation filters
 * (options.filterFn) will have their thread's `visible` property set to `hidden`
 * (an exception is made if that annotation's thead has been forced visible by
 * a user).
 *
 * @return The root thread, whose children are the top-level annotations to display.
 */
export function buildThread(
  annotations: Annotation[],
  options: BuildThreadOptions
): Thread {
  const hasSelection = options.selected.length > 0;
  const hasForcedVisible = options.forcedVisible.length > 0;

  let thread = threadAnnotations(annotations);

  if (hasSelection) {
    // Remove threads (annotations) that are not selected or
    // are not forced-visible
    thread.children = thread.children.filter(child => {
      const isSelected = options.selected.includes(child.id);
      const isForcedVisible =
        hasForcedVisible && options.forcedVisible.includes(child.id);
      return isSelected || isForcedVisible;
    });
  }

  if (options.threadFilterFn) {
    // Remove threads not matching thread-level filters
    thread.children = thread.children.filter(options.threadFilterFn);
  }

  // Set visibility for threads.
  // The root thread itself should be set as non-visible, to avoid confusion
  // when counting visible threads. It's a container thread: its children
  // are the top-level annotations.
  thread.visible = false;
  thread = mapThread(thread, thread => {
    let threadIsVisible = thread.visible;

    if (options.filterFn) {
      if (hasForcedVisible && options.forcedVisible.includes(thread.id)) {
        // This thread may or may not match the filter, but we should
        // make sure it is visible because it has been forced visible by user
        threadIsVisible = true;
      } else if (thread.annotation) {
        // Otherwise, visibility depends on whether its annotation matches the filter
        threadIsVisible = !!options.filterFn(thread.annotation);
      } else {
        threadIsVisible = false;
      }
    }
    return { ...thread, visible: threadIsVisible };
  });

  // Remove top-level threads which contain no visible annotations
  thread.children = thread.children.filter(
    child => child.visible || hasVisibleChildren(child)
  );

  // Determine collapsed state for UI
  thread = mapThread(thread, thread => {
    const threadStates = {
      collapsed: thread.collapsed,
    };

    if (hasOwn(options.expanded, thread.id)) {
      // This thread has been explicitly expanded/collapsed by user
      threadStates.collapsed = !options.expanded[thread.id];
    } else {
      // If annotations are filtered, and at least one child matches
      // those filters, make sure thread is not collapsed
      const hasUnfilteredChildren =
        options.filterFn && hasVisibleChildren(thread);
      threadStates.collapsed = thread.collapsed && !hasUnfilteredChildren;
    }
    return { ...thread, ...threadStates };
  });

  // Sort the root thread according to the current search criteria
  //const compareFn = options.sortCompareFn ?? defaultSortCompareFn;
  thread = sortThread(thread, options.sortCompareFn, replySortCompareFn);

  // Update `replyCount` and `depth` properties
  thread = countRepliesAndDepth(thread, -1);

  return thread;
}
