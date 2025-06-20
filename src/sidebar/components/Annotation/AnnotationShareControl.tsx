import {
  CopyIcon,
  IconButton,
  Input,
  InputGroup,
  Popover,
  ShareIcon,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

import { isIOS } from '../../../shared/user-agent';
import type { Annotation } from '../../../types/api';
import { isShareableURI } from '../../helpers/annotation-sharing';
import { isPrivate } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { copyPlainText } from '../../util/copy-to-clipboard';

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

  const copyShareLink = async () => {
    try {
      await copyPlainText(shareUri);
      toastMessenger.success('Copied share link to clipboard');
    } catch {
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
    <div className="relative" ref={shareRef}>
      <IconButton
        icon={ShareIcon}
        title="Share"
        onClick={toggleSharePanel}
        expanded={isOpen}
      />
      <Popover
        open={isOpen}
        onClose={closePanel}
        anchorElementRef={shareRef}
        align="right"
        placement="above"
        arrow
        classes={classnames({
          // Set explicit width for browsers not supporting native popover API
          'w-max':
            // eslint-disable-next-line no-prototype-builtins
            !HTMLElement.prototype.hasOwnProperty('popover'),
        })}
      >
        <div className="p-2 flex flex-col gap-y-2">
          <h2 className="text-brand text-md font-medium">
            Share this annotation
          </h2>
          <div className="flex w-full text-base">
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
                This annotation cannot be shared in its original context because
                it was made on a document that is not available on the web. This
                link shares the annotation by itself.
              </>
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}

export default withServices(AnnotationShareControl, ['toastMessenger']);
