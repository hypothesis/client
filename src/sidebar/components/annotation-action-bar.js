'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { withServices } = require('../util/service-context');
const { isShareable, shareURI } = require('../util/annotation-sharing');

const AnnotationShareControl = require('./annotation-share-control');
const IconButton = require('./icon-button');

/**
 * A collection of `IconButton`s in the footer area of an annotation.
 */
function AnnotationActionBar({
  annotation,
  isPrivate,
  onDelete,
  onEdit,
  onFlag,
  onReply,
  groups,
  permissions,
  session,
  settings,
}) {
  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = action => {
    return permissions.permits(
      annotation.permissions,
      action,
      session.state.userid
    );
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');
  // Anyone may flag an annotation except the annotation's author.
  // This option is even presented to anonymous users
  const showFlagAction = session.state.userid !== annotation.user;
  const showShareAction = isShareable(annotation, settings);

  const annotationGroup = groups.get(annotation.group);

  return (
    <div className="annotation-action-bar">
      {showEditAction && (
        <IconButton icon="edit" title="Edit" onClick={onEdit} />
      )}
      {showDeleteAction && (
        <IconButton icon="trash" title="Delete" onClick={onDelete} />
      )}
      <IconButton icon="reply" title="Reply" onClick={onReply} />
      {showShareAction && (
        <AnnotationShareControl
          group={annotationGroup}
          isPrivate={isPrivate}
          shareUri={shareURI(annotation)}
        />
      )}
      {showFlagAction && !annotation.flagged && (
        <IconButton
          icon="flag"
          title="Report this annotation to moderators"
          onClick={onFlag}
        />
      )}
      {showFlagAction && annotation.flagged && (
        <IconButton
          isActive={true}
          icon="flag--active"
          title="Annotation has been reported to the moderators"
        />
      )}
    </div>
  );
}

AnnotationActionBar.propTypes = {
  annotation: propTypes.object.isRequired,
  /** Is this annotation shared at the group level or marked as "only me"/private? */
  isPrivate: propTypes.bool.isRequired,
  /** Callbacks for when action buttons are clicked/tapped */
  onEdit: propTypes.func.isRequired,
  onDelete: propTypes.func.isRequired,
  onFlag: propTypes.func.isRequired,
  onReply: propTypes.func.isRequired,

  // Injected services
  groups: propTypes.object.isRequired,
  permissions: propTypes.object.isRequired,
  session: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
};

AnnotationActionBar.injectedProps = [
  'groups',
  'permissions',
  'session',
  'settings',
];

module.exports = withServices(AnnotationActionBar);
