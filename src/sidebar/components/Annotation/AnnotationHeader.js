import { Icon, LinkButton } from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';

import { withServices } from '../../service-context';
import { useSidebarStore } from '../../store';
import {
  domainAndTitle,
  isHighlight,
  isReply,
  hasBeenEdited,
} from '../../helpers/annotation-metadata';
import { annotationAuthorInfo } from '../../helpers/annotation-user';
import { isPrivate } from '../../helpers/permissions';

import AnnotationDocumentInfo from './AnnotationDocumentInfo';
import AnnotationShareInfo from './AnnotationShareInfo';
import AnnotationTimestamps from './AnnotationTimestamps';
import AnnotationUser from './AnnotationUser';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/config').SidebarSettings} SidebarSettings
 */

/** @param {{ children: import("preact").ComponentChildren}} props */
function HeaderRow({ children }) {
  return (
    <div className="flex gap-x-1 items-baseline flex-wrap-reverse">
      {children}
    </div>
  );
}

/**
 * @typedef AnnotationHeaderProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isEditing] - Whether the annotation is actively being edited
 * @prop {number} replyCount - How many replies this annotation currently has
 * @prop {boolean} threadIsCollapsed - Is this thread currently collapsed?
 * @prop {SidebarSettings} settings - Injected
 *
 */

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 *
 * @param {AnnotationHeaderProps} props
 */
function AnnotationHeader({
  annotation,
  isEditing,
  replyCount,
  threadIsCollapsed,
  settings,
}) {
  const store = useSidebarStore();

  const { authorDisplayName, authorLink } = useMemo(
    () => annotationAuthorInfo(annotation, store, settings),
    [annotation, store, settings]
  );

  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;

  // Link (URL) to single-annotation view for this annotation, if it has
  // been provided by the service. Note: this property is not currently
  // present on third-party annotations.
  const annotationUrl = annotation.links?.html || '';

  const showEditedTimestamp = useMemo(() => {
    return hasBeenEdited(annotation) && !isCollapsedReply;
  }, [annotation, isCollapsedReply]);

  // Pull together some document metadata related to this annotation
  const documentInfo = domainAndTitle(annotation);
  // There are some cases at present in which linking directly to an
  // annotation's document is not immediately feasible—e.g in an LMS context
  // where the original document might not be available outside of an
  // assignment (e.g. Canvas files), and/or wouldn't be able to present
  // any associated annotations.
  // For the present, disable links to annotation documents for all third-party
  // annotations until we have a more nuanced way of making linking determinations.
  // The absence of a link to a single-annotation view is a signal that this
  // is a third-party annotation.
  // Also, of course, verify that there is a URL to the document (titleLink)
  const documentLink =
    annotationUrl && documentInfo.titleLink ? documentInfo.titleLink : '';
  // Show document information on non-sidebar routes, assuming there is a title
  // to show, at the least
  const showDocumentInfo =
    store.route() !== 'sidebar' && documentInfo.titleText;

  const onReplyCountClick = () =>
    // If an annotation has replies it must have been saved and therefore have
    // an ID.
    store.setExpanded(/** @type {string} */ (annotation.id), true);

  const group = store.getGroup(annotation.group);

  return (
    <header>
      <HeaderRow>
        {isPrivate(annotation.permissions) && !isEditing && (
          <Icon
            classes="text-tiny"
            name="lock"
            title="This annotation is visible only to you"
          />
        )}
        <AnnotationUser
          authorLink={authorLink}
          displayName={authorDisplayName}
        />
        {replyCount > 0 && isCollapsedReply && (
          <LinkButton onClick={onReplyCountClick} title="Expand replies">
            {`${replyCount} ${replyCount > 1 ? 'replies' : 'reply'}`}
          </LinkButton>
        )}

        {!isEditing && annotation.created && (
          <div className="flex justify-end grow">
            <AnnotationTimestamps
              annotationCreated={annotation.created}
              annotationUpdated={annotation.updated}
              annotationUrl={annotationUrl}
              withEditedTimestamp={showEditedTimestamp}
            />
          </div>
        )}
      </HeaderRow>

      {!isReply(annotation) && (
        <HeaderRow>
          {group && (
            <AnnotationShareInfo
              group={group}
              isPrivate={isPrivate(annotation.permissions)}
            />
          )}
          {!isEditing && isHighlight(annotation) && (
            <Icon
              name="highlight"
              title="This is a highlight. Click 'edit' to add a note or tag."
              classes="text-tiny text-color-text-light"
            />
          )}
          {showDocumentInfo && (
            <AnnotationDocumentInfo
              domain={documentInfo.domain}
              link={documentLink}
              title={documentInfo.titleText}
            />
          )}
        </HeaderRow>
      )}
    </header>
  );
}

export default withServices(AnnotationHeader, ['settings']);
