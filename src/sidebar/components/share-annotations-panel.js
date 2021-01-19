import { createElement, Fragment } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';
import { pageSharingLink } from '../helpers/annotation-sharing';
import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../service-context';
import { notNull } from '../util/typing';

import Button from './button';
import ShareLinks from './share-links';
import SidebarPanel from './sidebar-panel';
import Spinner from './spinner';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef ShareAnnotationsPanelProps
 * @prop {Object} analytics - Injected service
 * @prop {Object} toastMessenger - Injected service
 */

/**
 * A panel for sharing the current group's annotations on the current document.
 *
 * Links within this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 *
 * @param {ShareAnnotationsPanelProps} props
 */
function ShareAnnotationsPanel({ analytics, toastMessenger }) {
  const store = useStoreProxy();
  const mainFrame = store.mainFrame();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  // Generate bouncer sharing link for annotations in the current group.
  // This is the URI format for the web-sharing link shown in the input
  // and is available to be copied to clipboard
  const shareURI = ((frame, group) => {
    return group && frame
      ? `https://ec2co-ecsel-dii7haomvslr-157781352.eu-west-2.elb.amazonaws.com/go?url=${encodeURIComponent(frame.uri)}&group=${
          group.id
        }`
      : '';
  })(mainFrame, focusedGroup);
  // To be able to concoct a sharing link, a focused group and frame need to
  // be available
  const sharingReady = focusedGroup && mainFrame;

  // const shareURI =
  //   sharingReady &&
  //   pageSharingLink(notNull(mainFrame).uri, notNull(focusedGroup).id);


  const copyShareLink = () => {
    try {
      copyText(/** @type {string} */ (shareURI));
      toastMessenger.success('Copied share link to clipboard');
    } catch (err) {
      toastMessenger.error('Unable to copy link');
    }
  };

  return (
    <SidebarPanel
      title={panelTitle}
      panelName={uiConstants.PANEL_SHARE_ANNOTATIONS}
    >
      {!sharingReady && (
        <div className="share-annotations-panel__spinner">
          <Spinner />
        </div>
      )}
      {sharingReady && (
        <div className="share-annotations-panel">
          {shareURI ? (
            <Fragment>
              <div className="share-annotations-panel__intro">
                {notNull(focusedGroup).type === 'private' ? (
                  <p>
                    Use this link to share these annotations with other group
                    members:
                  </p>
                ) : (
                  <p>Use this link to share these annotations with anyone:</p>
                )}
              </div>
              <div className="u-layout-row">
                <input
                  aria-label="Use this URL to share these annotations"
                  className="share-annotations-panel__form-input"
                  type="text"
                  value={shareURI}
                  readOnly
                />
                <Button
                  icon="copy"
                  onClick={copyShareLink}
                  title="Copy share link"
                  className="share-annotations-panel__icon-button"
                />
              </div>
              <p>
                {notNull(focusedGroup).type === 'private' ? (
                  <span>
                    Annotations in the private group{' '}
                    <em>{notNull(focusedGroup).name}</em> are only visible to
                    group members.
                  </span>
                ) : (
                  <span>
                    Anyone using this link may view the annotations in the group{' '}
                    <em>{notNull(focusedGroup).name}</em>.
                  </span>
                )}{' '}
                <span>
                  Private (
                  <SvgIcon name="lock" inline className="u-icon--inline" />{' '}
                  <em>Only Me</em>) annotations are only visible to you.
                </span>
              </p>
              <ShareLinks
                shareURI={shareURI}
                analyticsEventName={analytics.events.DOCUMENT_SHARED}
              />
            </Fragment>
          ) : (
            <p>
              These annotations cannot be shared because this document is not
              available on the web.
            </p>
          )}
        </div>
      )}
    </SidebarPanel>
  );
}

ShareAnnotationsPanel.propTypes = {
  analytics: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

ShareAnnotationsPanel.injectedProps = ['analytics', 'toastMessenger'];

export default withServices(ShareAnnotationsPanel);
