import { useElementShouldClose } from '@hypothesis/frontend-shared';
import {
  Card,
  IconButton,
  Input,
  InputGroup,
  CopyIcon,
  ShareIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

import { isIOS } from '../../../shared/user-agent';
import type { Annotation } from '../../../types/api';
import { isShareableURI } from '../../helpers/annotation-sharing';
import { isPrivate } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { copyText } from '../../util/copy-to-clipboard';
import MenuArrow from '../MenuArrow';
import ShareLinks from '../ShareLinks';

export type AnnotationShareControlProps = {
  /** The annotation in question */
  annotation: Annotation;

  /** The URI to view the annotation on its own */
  shareUri: string;

  // Injected
  toastMessenger: ToastMessengerService;
};

function selectionOverflowsInputElement() {
  // On iOS the selection overflows the input element
  // See: https://github.com/hypothesis/client/pull/2799
  return isIOS();
}

/**
 * "Popup"-style component for sharing a single annotation.
 *
 * @param {AnnotationShareControlProps} props
 */
function AnnotationShareControl({
  annotation,
  toastMessenger,
  shareUri,
}: AnnotationShareControlProps) {
  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);

  const annotationIsPrivate = isPrivate(annotation.permissions);
  const inContextAvailable = isShareableURI(annotation.uri);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setOpen] = useState(false);
  const wasOpen = useRef(isOpen);

  const toggleSharePanel = () => setOpen(!isOpen);
  const closePanel = () => setOpen(false);

  // Interactions outside of the component when it is open should close it
  useElementShouldClose(shareRef, isOpen, closePanel);

  useEffect(() => {
    if (wasOpen.current !== isOpen) {
      wasOpen.current = isOpen;

      if (isOpen && !selectionOverflowsInputElement()) {
        // Panel was just opened: select and focus the share URI for convenience
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [isOpen]);

  if (!group) {
    // This can happen if groups have just been unloaded but annotations have
    // not yet been unloaded, e.g. on logout if a private group was focused
    return null;
  }

  // NB: Sharing links (social media/email) are not currently shown for `html`
  // links. There are two reasons for this:
  // - Lack of vertical real estate available. The explanatory text about `html`
  //   links takes up several lines. Adding the sharing links below this runs
  //   the risk of interfering with the top bar or other elements outside of the
  //   annotation's card. This may be rectified with a design tweak, perhaps.
  // - Possible confusion about what the sharing link does. The difference
  //   between an `incontext` and `html` link likely isn't clear to users. This
  //   bears further discussion.
  const showShareLinks = inContextAvailable;

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
    // Make the container div focusable by setting a non-null `tabIndex`.
    // This prevents clicks on non-focusable contents from "leaking out" and
    // focusing a focusable ancester. If something outside of the panel gains
    // focus, `useElementShouldClose`'s focus listener will close the panel.
    // "Catch focus" here to prevent this.
    // See https://github.com/hypothesis/client/issues/5196
    <div className="relative" ref={shareRef} tabIndex={-1}>
      <IconButton
        icon={ShareIcon}
        title="Share"
        onClick={toggleSharePanel}
        expanded={isOpen}
      />
      {isOpen && (
        <div
          // Position this Card above its IconButton. Account for larger
          // IconButtons in touch interfaces
          className="absolute bottom-8 right-1 touch:bottom-touch-minimum"
        >
          <Card
            classes={classnames(
              // Prefer width 96 (24rem) but ensure that component isn't wider
              // than 85vw
              'w-96 max-w-[85vw]',
              'space-y-2 p-2'
            )}
            width="custom"
          >
            <h2 className="text-brand text-md font-medium">
              Share this annotation
            </h2>
            <div
              className={classnames(
                // Slightly larger font size for touch devices to correspond with
                // larger button and input sizes
                'flex w-full text-xs touch:text-base'
              )}
            >
              <InputGroup>
                <Input
                  aria-label="Use this URL to share this annotation"
                  type="text"
                  value={shareUri}
                  readOnly
                  elementRef={inputRef}
                />
                <IconButton
                  icon={CopyIcon}
                  title="Copy share link to clipboard"
                  onClick={copyShareLink}
                  variant="dark"
                />
              </InputGroup>
            </div>
            <div className="text-base font-normal" data-testid="share-details">
              {inContextAvailable ? (
                <>{annotationSharingInfo}</>
              ) : (
                <>
                  This annotation cannot be shared in its original context
                  because it was made on a document that is not available on the
                  web. This link shares the annotation by itself.
                </>
              )}
            </div>
            {showShareLinks && <ShareLinks shareURI={shareUri} />}
            <MenuArrow
              direction="down"
              classes="bottom-[-8px] right-1 touch:right-[9px]"
            />
          </Card>
        </div>
      )}
    </div>
  );
}

export default withServices(AnnotationShareControl, ['toastMessenger']);
