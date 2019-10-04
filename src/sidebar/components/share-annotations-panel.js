'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useRef } = require('preact/hooks');
const useStore = require('../store/use-store');
const { copyText } = require('../util/copy-to-clipboard');
const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');

const SidebarPanel = require('./sidebar-panel');
const SvgIcon = require('./svg-icon');

/**
 * A panel for sharing the current group's annotations.
 *
 * Links withinin this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 */
function ShareAnnotationsPanel({ analytics, flash }) {
  const mainFrame = useStore(store => store.mainFrame());
  const focusedGroup = useStore(store => store.focusedGroup());

  // We can render a basic frame for the panel at any time,
  // but hold off rendering panel content if needed things aren't present.
  // We need to know what page we're on and what group is focused.
  const shouldRenderPanelContent = focusedGroup && mainFrame;

  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  // Generate bouncer sharing link for annotations in the current group
  const shareURI = ((frame, group) => {
    if (!frame || !group) {
      return '#';
    }
    return `https://hyp.is/go?url=${encodeURIComponent(mainFrame.uri)}&group=${
      group.id
    }`;
  })(mainFrame, focusedGroup);

  const trackShareClick = shareTarget => {
    analytics.track(analytics.events.DOCUMENT_SHARED, shareTarget);
  };

  const copyShareLink = () => {
    try {
      copyText(shareURI);
      flash.info('Copied share link to clipboard');
    } catch (err) {
      flash.error('Unable to copy link');
    }
  };

  const inputRef = useRef();

  return (
    <SidebarPanel
      title={panelTitle}
      panelName={uiConstants.PANEL_SHARE_ANNOTATIONS}
    >
      {shouldRenderPanelContent && (
        <div className="share-annotations-panel">
          <div className="share-annotations-panel__intro">
            {focusedGroup.type === 'private' ? (
              <p>
                Use this link to share these annotations with other group
                members:
              </p>
            ) : (
              <p>Use this link to share these annotations with anyone:</p>
            )}
          </div>
          <div className="share-annotations-panel__input">
            <input
              ref={inputRef}
              className="form-input share-annotations-panel__form-input"
              type="text"
              value={shareURI}
              readOnly
            />
            <button
              onClick={copyShareLink}
              title="copy share link"
              aria-label="copy share link"
              className="btn btn-clean share-annotations-panel__copy-btn"
            >
              <SvgIcon name="copy" />
            </button>
          </div>
          <p>
            {focusedGroup.type === 'private' ? (
              <span>
                Annotations in the private group <em>{focusedGroup.name}</em>{' '}
                are only visible to group members.
              </span>
            ) : (
              <span>
                Anyone using this link may view the annotations in the group{' '}
                <em>{focusedGroup.name}</em>.
              </span>
            )}{' '}
            <span>
              Private (
              <SvgIcon
                name="lock"
                inline
                className="share-annotations-panel__icon--inline"
              />{' '}
              <em>Only Me</em>) annotations are only visible to you.
            </span>
          </p>
          <ul className="share-annotations-panel__links">
            <li className="share-annotations-panel__link">
              <a
                href={`https://twitter.com/intent/tweet?url=${shareURI}&hashtags=annotated`}
                title="Tweet share link"
                onClick={trackShareClick('twitter')}
              >
                <SvgIcon
                  name="twitter"
                  className="share-annotations-panel__icon"
                />
              </a>
            </li>
            <li className="share-annotations-panel__link">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareURI}`}
                title="Share on Facebook"
                onClick={trackShareClick('facebook')}
              >
                <SvgIcon
                  name="facebook"
                  className="share-annotations-panel__icon"
                />
              </a>
            </li>
            <li className="share-annotations-panel__link">
              <a
                href={`mailto:?subject=Let's%20Annotate&amp;body=${shareURI}`}
                title="Share via email"
                onClick={trackShareClick('email')}
              >
                <SvgIcon
                  name="email"
                  className="share-annotations-panel__icon"
                />
              </a>
            </li>
          </ul>
        </div>
      )}
    </SidebarPanel>
  );
}

ShareAnnotationsPanel.propTypes = {
  // Injected services
  analytics: propTypes.object.isRequired,
  flash: propTypes.object.isRequired,
};

ShareAnnotationsPanel.injectedProps = ['analytics', 'flash'];

module.exports = withServices(ShareAnnotationsPanel);
