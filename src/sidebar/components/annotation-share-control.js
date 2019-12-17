'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useEffect, useRef, useState } = require('preact/hooks');

const useElementShouldClose = require('./hooks/use-element-should-close');
const { copyText } = require('../util/copy-to-clipboard');
const { withServices } = require('../util/service-context');

const IconButton = require('./icon-button');
const ShareLinks = require('./share-links');
const SvgIcon = require('./svg-icon');

/**
 * "Popup"-style component for sharing a single annotation.
 */
function AnnotationShareControl({
  analytics,
  flash,
  group,
  isPrivate,
  shareUri,
}) {
  const shareRef = useRef();
  const inputRef = useRef();

  const [isOpen, setOpen] = useState(false);
  const wasOpen = useRef(isOpen);

  const toggleSharePanel = () => setOpen(!isOpen);
  const closePanel = () => setOpen(false);

  // Interactions outside of the component when it is open should close it
  useElementShouldClose(shareRef, isOpen, closePanel);

  useEffect(() => {
    if (wasOpen.current !== isOpen) {
      wasOpen.current = isOpen;
      if (isOpen) {
        // Panel was just opened: select and focus the share URI for convenience
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isOpen]);

  // FIXME: See https://github.com/hypothesis/client/issues/1542
  if (!group) {
    return null;
  }

  const copyShareLink = () => {
    try {
      copyText(shareUri);
      flash.info('Copied share link to clipboard');
    } catch (err) {
      flash.error('Unable to copy link');
    }
  };

  // Generate some descriptive text about who may see the annotation if they
  // follow the share link.
  // First: Based on the type of the group the annotation is in, who would
  // be able to view it?
  const groupSharingInfo =
    group.type === 'private' ? (
      <span>
        Only members of the group <em>{group.name}</em> may view this
        annotation.
      </span>
    ) : (
      <span>Anyone using this link may view this annotation.</span>
    );

  // However, if the annotation is marked as "only me" (`isPrivate` is `true`),
  // then group sharing settings are irrelevant—only the author may view the
  // annotation.
  const annotationSharingInfo = isPrivate ? (
    <span>Only you may view this annotation.</span>
  ) : (
    groupSharingInfo
  );

  return (
    <div className="annotation-share-control" ref={shareRef}>
      <IconButton icon="share" title="Share" onClick={toggleSharePanel} />
      {isOpen && (
        <div className="annotation-share-panel">
          <div className="annotation-share-panel__header">
            <div className="annotation-share-panel__title">
              Share this annotation
            </div>
          </div>
          <div className="annotation-share-panel__content">
            <div className="annotation-share-panel__input">
              <input
                aria-label="Use this URL to share this annotation"
                className="form-input"
                type="text"
                value={shareUri}
                readOnly
                ref={inputRef}
              />
              <button
                className="annotation-share-panel__copy-btn"
                aria-label="Copy share link to clipboard"
                onClick={copyShareLink}
              >
                <SvgIcon name="copy" />
              </button>
            </div>
            <div className="annotation-share-panel__permissions">
              {annotationSharingInfo}
            </div>
            <ShareLinks
              shareURI={shareUri}
              analyticsEventName={analytics.events.ANNOTATION_SHARED}
              className="annotation-share-control__links"
            />
          </div>
          <SvgIcon name="pointer" className="annotation-share-panel__arrow" />
        </div>
      )}
    </div>
  );
}

AnnotationShareControl.propTypes = {
  /** group that the annotation is in
   *  If missing, this component will not render
   *  FIXME: Refactor after root cause is addressed
   *  See https://github.com/hypothesis/client/issues/1542
   */
  group: propTypes.object,
  /** Is this annotation set to "only me"/private? */
  isPrivate: propTypes.bool.isRequired,
  /** The URI to view the annotation on its own */
  shareUri: propTypes.string.isRequired,

  /* services */
  analytics: propTypes.object.isRequired,
  flash: propTypes.object.isRequired,
};

AnnotationShareControl.injectedProps = ['analytics', 'flash'];

module.exports = withServices(AnnotationShareControl);
