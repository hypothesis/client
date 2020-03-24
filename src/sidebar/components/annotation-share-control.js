import { createElement } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { copyText } from '../util/copy-to-clipboard';
import { isPrivate } from '../util/permissions';
import { withServices } from '../util/service-context';

import Button from './button';
import useElementShouldClose from './hooks/use-element-should-close';
import ShareLinks from './share-links';
import SvgIcon from './svg-icon';

/**
 * "Popup"-style component for sharing a single annotation.
 */
function AnnotationShareControl({
  annotation,
  analytics,
  toastMessenger,
  group,
  shareUri,
}) {
  const annotationIsPrivate = isPrivate(
    annotation.permissions,
    annotation.user
  );
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
      toastMessenger.success('Copied share link to clipboard');
    } catch (err) {
      toastMessenger.error('Unable to copy link');
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

  // However, if the annotation is marked as "only me" (`annotationIsPrivate` is `true`),
  // then group sharing settings are irrelevant—only the author may view the
  // annotation.
  const annotationSharingInfo = annotationIsPrivate ? (
    <span>Only you may view this annotation.</span>
  ) : (
    groupSharingInfo
  );

  return (
    <div className="annotation-share-control" ref={shareRef}>
      <Button icon="share" title="Share" onClick={toggleSharePanel} />
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
              <Button
                icon="copy"
                title="Copy share link to clipboard"
                onClick={copyShareLink}
                useInputStyle
                useCompactStyle
              />
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
  /* The annotation in question */
  annotation: propTypes.object.isRequired,
  /** group that the annotation is in
   *  If missing, this component will not render
   *  FIXME: Refactor after root cause is addressed
   *  See https://github.com/hypothesis/client/issues/1542
   */
  group: propTypes.object,
  /** The URI to view the annotation on its own */
  shareUri: propTypes.string.isRequired,

  /* services */
  analytics: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

AnnotationShareControl.injectedProps = ['analytics', 'toastMessenger'];

export default withServices(AnnotationShareControl);
