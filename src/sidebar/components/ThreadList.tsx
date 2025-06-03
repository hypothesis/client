import {
  AnnotationCard,
  annotationRole,
  isReply,
} from '@hypothesis/annotations-ui-lib';
import type {
  Annotation,
  EPUBContentSelector,
  MentionMode,
} from '@hypothesis/annotations-ui-lib';
import { confirm, ListenerCollection } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { useEffect, useLayoutEffect, useMemo, useState } from 'preact/hooks';

import { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { isThirdPartyUser, username } from '../helpers/account-id';
import { annotationAuthorLink } from '../helpers/annotation-user';
import type { Thread } from '../helpers/build-thread';
import { mostRelevantAnnotation } from '../helpers/highlighted-annotations';
import { combineUsersForMentions } from '../helpers/mention-suggestions';
import { permits } from '../helpers/permissions';
import {
  calculateVisibleThreads,
  THREAD_DIMENSION_DEFAULTS,
} from '../helpers/visible-threads';
import { withServices } from '../service-context';
import type { AnnotationsService } from '../services/annotations';
import type { GroupsService } from '../services/groups';
import type { TagsService } from '../services/tags';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import { getElementHeightWithMargins } from '../util/dom';

// The precision of the `scrollPosition` value in pixels; values will be rounded
// down to the nearest multiple of this scale value
const SCROLL_PRECISION = 50;

function getScrollContainer() {
  const container = document.querySelector('.js-thread-list-scroll-root');
  if (!container) {
    throw new Error('Scroll container is missing');
  }
  return container;
}

function roundScrollPosition(pos: number) {
  return Math.max(pos - (pos % SCROLL_PRECISION), 0);
}

export type ThreadListProps = {
  threads: Thread[];

  // injected
  annotationsService: AnnotationsService;
  groups: GroupsService;
  settings: SidebarSettings;
  tags: TagsService;
  toastMessenger: ToastMessengerService;
};

/**
 * Find the selector identifying the document segment which an annotation
 * belongs to.
 */
function getSegmentSelector(ann: Annotation): EPUBContentSelector | undefined {
  const target = ann.target[0];
  if (!target) {
    // Page Notes that have just been created do not have a target. All saved
    // annotations and new annotations/highlights do.
    //
    // FIXME - Fix this inconsistency for page notes.
    return undefined;
  }
  return target.selector?.find(s => s.type === 'EPUBContentSelector') as
    | EPUBContentSelector
    | undefined;
}

function flaggingEnabled(settings: SidebarSettings) {
  const service = serviceConfig(settings);
  if (service?.allowFlagging === false) {
    return false;
  }
  return true;
}

/**
 * Return a key that identifies the document section to which an annotation
 * belongs.
 */
function headingKey(thread: Thread): string | null {
  if (!thread.annotation) {
    return null;
  }
  const chapter = getSegmentSelector(thread.annotation);
  return chapter?.cfi ?? null;
}

/** Build a map of heading key (see {@link headingKey}) to section heading. */
function headingMap(threads: Thread[]): Map<string, string> {
  const headings = new Map();

  for (const thread of threads) {
    if (!thread.annotation) {
      continue;
    }
    const selector = getSegmentSelector(thread.annotation);
    if (selector?.title) {
      headings.set(selector.cfi, selector.title);
    }
  }

  return headings;
}

/**
 * Render a list of threads.
 *
 * The thread list is "virtualized", meaning that only threads in or near the
 * viewport are rendered. This is critical for performance and memory usage as
 * annotations (and replies) are complex interactive components whose
 * user-defined content may include rich media such as images, audio clips,
 * embedded YouTube videos, rendered math and more.
 */
function ThreadList({
  threads,
  annotationsService,
  groups: groupsService,
  settings,
  tags: tagsService,
  toastMessenger,
}: ThreadListProps) {
  // Client height of the scroll container.
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

  // Scroll offset of scroll container, rounded to a multiple of `SCROLL_PRECISION`
  // to avoid excessive re-renderings.
  const [scrollPosition, setScrollPosition] = useState(0);

  // Measure the initial size and offset of the scroll container once rendering
  // is complete and attach listeners to observe future size or scroll offset changes.
  useLayoutEffect(() => {
    const listeners = new ListenerCollection();
    const scrollContainer = getScrollContainer();

    setScrollContainerHeight(scrollContainer.clientHeight);
    setScrollPosition(roundScrollPosition(scrollContainer.scrollTop));

    const updateScrollPosition = debounce(
      () => {
        setScrollContainerHeight(scrollContainer.clientHeight);
        setScrollPosition(roundScrollPosition(scrollContainer.scrollTop));
      },
      10,
      { maxWait: 100 },
    );

    listeners.add(scrollContainer, 'scroll', updateScrollPosition);

    // We currently assume that the scroll container's size only changes with
    // the window as a whole. A more general approach would involve using
    // ResizeObserver via the `observeElementSize` utility.
    listeners.add(window, 'resize', updateScrollPosition);

    return () => {
      listeners.removeAll();
      updateScrollPosition.cancel();
    };
  }, []);

  // Map of thread ID to measured height of thread. The height of each thread
  // includes any headings displayed immediately above it.
  const [threadHeights, setThreadHeights] = useState(() => new Map());

  // ID of thread to scroll to after the next render. If the thread is not
  // present, the value persists until it can be "consumed".
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  const topLevelThreads = threads;

  const { offscreenLowerHeight, offscreenUpperHeight, visibleThreads } =
    useMemo(
      () =>
        calculateVisibleThreads(
          topLevelThreads,
          threadHeights,
          scrollPosition,
          scrollContainerHeight,
        ),
      [topLevelThreads, threadHeights, scrollPosition, scrollContainerHeight],
    );

  // Compute the heading to display above each thread. Headings are only shown
  // in some document types (eg. VitalSource books).
  //
  // We compute the map based on the full list of threads, not just the rendered
  // ones, so the association doesn't change while scrolling.
  const headings = useMemo(() => {
    let prevHeadingKey: string | null = null;
    let prevHeading: string | null = null;

    const headingForKey = headingMap(threads);

    const headings = new Map();
    for (const thread of threads) {
      const key = headingKey(thread);
      if (!key || prevHeadingKey === key) {
        continue;
      }

      prevHeadingKey = key;

      const heading = headingForKey.get(key) ?? 'Untitled chapter';
      if (prevHeading === heading) {
        // In some books (eg. VitalSource PDF-based books) a single logical
        // chapter gets split into many content documents and the heading is
        // repeated for each of them. We only want to render distinct headings.
        continue;
      }

      prevHeading = heading;
      headings.set(thread, heading);
    }
    return headings;
  }, [threads]);

  const store = useSidebarStore();
  const currentUserId = store.profile().userid;
  const editing = store.countDrafts() > 0;
  const highlightedAnnotations = store.highlightedAnnotations();
  const allAnnotations = store.allAnnotations();

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

  const mostRelevantHighlightedAnnotationId = useMemo(
    () =>
      mostRelevantAnnotation(allAnnotations, {
        highlightedAnnotations,
        currentUserId,
      })?.id,
    [allAnnotations, currentUserId, highlightedAnnotations],
  );

  // Scroll to the most relevant highlighted annotation, unless creating/editing
  // another annotation
  useEffect(() => {
    if (!editing && mostRelevantHighlightedAnnotationId) {
      setScrollToId(mostRelevantHighlightedAnnotationId);
    }
  }, [editing, mostRelevantHighlightedAnnotationId]);

  // Effect to scroll a particular thread into view. This is mainly used to
  // scroll a newly created annotation into view.
  useEffect(() => {
    if (!scrollToId) {
      return;
    }

    const threadIndex = topLevelThreads.findIndex(t => t.id === scrollToId);
    if (threadIndex === -1) {
      // Thread is not currently present. The `scrollToId` will be consumed
      // when this thread appears.
      return;
    }

    // Clear `scrollToId` so we don't scroll again after the next render.
    setScrollToId(null);

    const getThreadHeight = (thread: Thread) =>
      threadHeights.get(thread.id) || THREAD_DIMENSION_DEFAULTS.defaultHeight;

    const yOffset = topLevelThreads
      .slice(0, threadIndex)
      .reduce((total, thread) => total + getThreadHeight(thread), 0);

    const scrollContainer = getScrollContainer();
    scrollContainer.scrollTop = yOffset;
  }, [scrollToId, topLevelThreads, threadHeights]);

  // When the set of visible threads changes, recalculate the real rendered
  // heights of thread cards and update `threadHeights` state if there are changes.
  useEffect(() => {
    setThreadHeights(prevHeights => {
      const changedHeights = new Map();
      for (const { id } of visibleThreads) {
        const threadElement = document.getElementById(id)!;

        if (!threadElement) {
          // This could happen if the `ThreadList` DOM is not connected to the document.
          //
          // Errors earlier in the render can also potentially cause this (see
          // https://github.com/hypothesis/client/pull/3665#issuecomment-895857072),
          // although we don't in general try to make all effects robust to that
          // as it is a problem that needs to be handled elsewhere.
          console.warn(
            'ThreadList could not measure thread. Element not found.',
          );
          return prevHeights;
        }

        const height = getElementHeightWithMargins(threadElement);
        if (height !== prevHeights.get(id)) {
          changedHeights.set(id, height);
        }
      }

      // Skip update if no heights changed from previous measured values
      // (or defaults).
      if (changedHeights.size === 0) {
        return prevHeights;
      }

      return new Map([...prevHeights, ...changedHeights]);
    });
  }, [visibleThreads]);

  const defaultAuthority = store.defaultAuthority();
  const profile = store.profile();
  const mentionMode = useMemo(
    (): MentionMode =>
      isThirdPartyUser(profile.userid, defaultAuthority)
        ? 'display-name'
        : 'username',
    [defaultAuthority, profile.userid],
  );

  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');
  const annotationAuthor = (annotation: Annotation) => {
    const displayName = annotation.user_info?.display_name;
    const name =
      displayNamesEnabled && displayName
        ? displayName
        : username(annotation.user);

    const userURL = store.getLink('user', { user: annotation.user });
    const link = annotationAuthorLink(
      annotation,
      settings,
      defaultAuthority,
      userURL,
    );

    return { name, link };
  };

  const mentionsEnabled = store.isFeatureEnabled('at_mentions');
  const usersWhoAnnotated = store.usersWhoAnnotated();
  const usersWhoWereMentioned = store.usersWhoWereMentioned();
  const focusedGroupMembers = store.getFocusedGroupMembers();
  const usersForMentions = useMemo(
    () =>
      combineUsersForMentions({
        usersWhoAnnotated,
        usersWhoWereMentioned,
        focusedGroupMembers,
        mentionMode,
      }),
    [
      focusedGroupMembers,
      mentionMode,
      usersWhoAnnotated,
      usersWhoWereMentioned,
    ],
  );

  useEffect(() => {
    // Load members for focused group only if not yet loaded
    if (mentionsEnabled && focusedGroupMembers.status === 'not-loaded') {
      groupsService.loadFocusedGroupMembers();
    }
  }, [focusedGroupMembers, groupsService, mentionsEnabled]);

  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = (
    action: 'update' | 'delete',
    annotation: Annotation,
  ) => {
    return permits(annotation.permissions, action, profile.userid);
  };

  const annotationFlaggingEnabled = (annotation: Annotation) =>
    flaggingEnabled(settings) &&
    !!profile.userid &&
    profile.userid !== annotation.user;

  return (
    <div>
      <div style={{ height: offscreenUpperHeight }} />
      {visibleThreads.map(child => (
        <div
          className={classnames(
            // The goal is to space out each annotation card vertically. Typically
            // this is better handled by applying vertical spacing to the parent
            // element (e.g. `space-y-3`) but in this case, the constraints of
            // sibling divs before and after the list of annotation cards prevents
            // this, so a bottom margin is added to each card's wrapping element.
            'mb-3',
          )}
          data-testid="thread-card-container"
          id={child.id}
          key={child.id}
        >
          {headings.get(child) && (
            <h3 className="text-md text-grey-7 font-bold pt-3 pb-2">
              {headings.get(child)}
            </h3>
          )}
          {child.annotation && (
            <AnnotationCard
              annotation={child.annotation}
              context={{
                features: {
                  atMentions: mentionsEnabled,
                  groupModeration: store.isFeatureEnabled('group_moderation'),
                  imageDescriptions:
                    store.isFeatureEnabled('image_descriptions'),
                },
                group: store.getGroup(child.annotation.group) ?? null,
                showGroupInHeader: store.route() !== 'sidebar',
                showEditAction: userIsAuthorizedTo('update', child.annotation),
                author: annotationAuthor(child.annotation),
                isHighlighted: store.isAnnotationHighlighted(child.annotation),
                isHovered: store.isAnnotationHovered(child.annotation.$tag),
                isOrphan: false, // TODO
                isSaving: store.isSavingAnnotation(child.annotation),
                mentionMode,
                usersForMentions,
                sharingEnabled: true, // TODO
                tagSuggestions: tagsService.filter(''),
                events: {
                  onSave: async annotation => {
                    const successMessage = `${annotationRole(annotation)} ${
                      annotation.id !== undefined ? 'updated' : 'saved'
                    }`;
                    try {
                      await annotationsService.save(annotation);
                      toastMessenger.success(successMessage, {
                        visuallyHidden: true,
                      });
                    } catch {
                      toastMessenger.error('Saving annotation failed');
                    }
                  },
                  onCancel: () => {
                    if (child.annotation && !child.annotation.id) {
                      store.removeAnnotations([child.annotation]);
                    }
                  },
                  onDelete: userIsAuthorizedTo('delete', child.annotation)
                    ? async () => {
                        const annType = annotationRole(child.annotation!);
                        if (
                          await confirm({
                            title: `Delete ${annType.toLowerCase()}?`,
                            message: `Are you sure you want to delete this ${annType.toLowerCase()}?`,
                            confirmAction: 'Delete',
                          })
                        ) {
                          try {
                            await annotationsService.delete(child.annotation!);
                            toastMessenger.success(`${annType} deleted`, {
                              visuallyHidden: true,
                            });
                          } catch (err) {
                            toastMessenger.error(err.message);
                          }
                        }
                      }
                    : undefined,
                  onTagsChange: tags => tagsService.store(tags),
                  onSetPrivate: isPrivate => {
                    if (child.annotation && !isReply(child.annotation)) {
                      store.setDefault(
                        'annotationPrivacy',
                        isPrivate ? 'private' : 'shared',
                      );
                    }
                  },
                  // onReply
                  onFlag: annotationFlaggingEnabled(child.annotation)
                    ? () => {
                        annotationsService
                          .flag(child.annotation!)
                          .catch(() =>
                            toastMessenger.error('Flagging annotation failed'),
                          );
                      }
                    : undefined,
                  // onCopyShareLink
                },
              }}
            />
          )}
          {/*<ThreadCard thread={child} />*/}
        </div>
      ))}
      <div style={{ height: offscreenLowerHeight }} />
    </div>
  );
}

export default withServices(ThreadList, [
  'annotationsService',
  'groups',
  'settings',
  'tags',
  'toastMessenger',
]);
