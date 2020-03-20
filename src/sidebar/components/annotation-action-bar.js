import { createElement } from 'preact';
import propTypes from 'prop-types';

import uiConstants from '../ui-constants';
import useStore from '../store/use-store';
import { isShareable, shareURI } from '../util/annotation-sharing';
import { isPrivate, permits } from '../util/permissions';
import { withServices } from '../util/service-context';

import AnnotationShareControl from './annotation-share-control';
import Button from './button';

/**
 * A collection of `Button`s in the footer area of an annotation that take
 * actions on the annotation.
 */
function AnnotationActionBar({
  annotation,
  annotationMapper,
  onReply,
  settings,
  toastMessenger,
}) {
  const userProfile = useStore(store => store.profile());
  const annotationGroup = useStore(store => store.getGroup(annotation.group));
  const isLoggedIn = useStore(store => store.isLoggedIn());

  const openSidebarPanel = useStore(store => store.openSidebarPanel);
  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = action => {
    return permits(annotation.permissions, action, userProfile.userid);
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');

  // Anyone may flag an annotation except the annotation's author.
  // This option is even presented to anonymous users
  const showFlagAction = userProfile.userid !== annotation.user;
  const showShareAction = isShareable(annotation, settings);

  const createDraft = useStore(store => store.createDraft);
  const updateFlagFn = useStore(store => store.updateFlagStatus);

  const updateFlag = () => {
    updateFlagFn(annotation.id, true);
  };

  const onDelete = () => {
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      annotationMapper.deleteAnnotation(annotation).catch(err => {
        toastMessenger.error(err.message, 'Deleting annotation failed');
      });
    }
  };

  const onEdit = () => {
    createDraft(annotation, {
      tags: annotation.tags,
      text: annotation.text,
      isPrivate: isPrivate(annotation.permissions),
    });
  };

  const onFlag = () => {
    if (!userProfile.userid) {
      toastMessenger.error('You must be logged in to report an annotation');
      return;
    }
    annotationMapper
      .flagAnnotation(annotation) // Flag annotation on service
      .then(updateFlag) // Update app state with flag
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = event => {
    if (!isLoggedIn) {
      openSidebarPanel(uiConstants.PANEL_LOGIN_PROMPT);
      return;
    }
    onReply(event);
  };

  return (
    <div className="annotation-action-bar">
      {showEditAction && <Button icon="edit" title="Edit" onClick={onEdit} />}
      {showDeleteAction && (
        <Button icon="trash" title="Delete" onClick={onDelete} />
      )}
      <Button icon="reply" title="Reply" onClick={onReplyClick} />
      {showShareAction && (
        <AnnotationShareControl
          annotation={annotation}
          group={annotationGroup}
          shareUri={shareURI(annotation)}
        />
      )}
      {showFlagAction && !annotation.flagged && (
        <Button
          icon="flag"
          title="Report this annotation to moderators"
          onClick={onFlag}
        />
      )}
      {showFlagAction && annotation.flagged && (
        <Button
          isPressed={true}
          icon="flag--active"
          title="Annotation has been reported to the moderators"
        />
      )}
    </div>
  );
}

AnnotationActionBar.propTypes = {
  annotation: propTypes.object.isRequired,
  /** Callbacks for when action buttons are clicked/tapped */
  onReply: propTypes.func.isRequired,

  // Injected services
  annotationMapper: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

AnnotationActionBar.injectedProps = [
  'annotationMapper',
  'settings',
  'toastMessenger',
];

export default withServices(AnnotationActionBar);
