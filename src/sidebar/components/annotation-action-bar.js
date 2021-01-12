import { createElement } from 'preact';
import propTypes from 'prop-types';

import uiConstants from '../ui-constants';
import { useStoreProxy } from '../store/use-store';
import {
  sharingEnabled,
  annotationSharingLink,
} from '../util/annotation-sharing';
import { isPrivate, permits } from '../util/permissions';
import { withServices } from '../util/service-context';

import AnnotationShareControl from './annotation-share-control';
import Button from './button';

/**
 *  @typedef {import("../../types/api").Annotation} Annotation
 *  @typedef {import('../../types/config').HostConfig} HostConfig
 */

/**
 * @typedef AnnotationActionBarProps
 * @prop {Annotation} annotation - The annotation in question
 * @prop {() => any} onReply - Callbacks for when action buttons are clicked/tapped
 * @prop {Object} annotationsService
 * @prop {HostConfig} settings
 * @prop {Object} toastMessenger
 */

/**
 * A collection of `Button`s in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
function AnnotationActionBar({
  annotation,
  annotationsService,
  onReply,
  settings,
  toastMessenger,
}) {
  const store = useStoreProxy();
  const userProfile = store.profile();
  const annotationGroup = store.getGroup(annotation.group);
  const isLoggedIn = store.isLoggedIn();

  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = action => {
    return permits(annotation.permissions, action, userProfile.userid);
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');

  //  Only authenticated users can flag an annotation, except the annotation's author.
  const showFlagAction =
    !!userProfile.userid && userProfile.userid !== annotation.user;

  const shareLink =
    sharingEnabled(settings) && annotationSharingLink(annotation);

  const onDelete = () => {
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      annotationsService.delete(annotation).catch(err => {
        toastMessenger.error(err.message);
      });
    }
  };

  const onEdit = () => {
    store.createDraft(annotation, {
      tags: annotation.tags,
      text: annotation.text,
      isPrivate: isPrivate(annotation.permissions),
    });
  };

  const onFlag = () => {
    annotationsService
      .flag(annotation)
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = () => {
    if (!isLoggedIn) {
      store.openSidebarPanel(uiConstants.PANEL_LOGIN_PROMPT);
      return;
    }
    onReply();
  };

  return (
    <div className="annotation-action-bar u-layout-row">
      {showEditAction && <Button icon="edit" title="Edit" onClick={onEdit} />}
      {showDeleteAction && (
        <Button icon="trash" title="Delete" onClick={onDelete} />
      )}
      <Button icon="reply" title="Reply" onClick={onReplyClick} />
      {shareLink && (
        <AnnotationShareControl
          annotation={annotation}
          group={annotationGroup}
          shareUri={shareLink}
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
  onReply: propTypes.func.isRequired,
  annotationsService: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

AnnotationActionBar.injectedProps = [
  'annotationsService',
  'settings',
  'toastMessenger',
];

export default withServices(AnnotationActionBar);
