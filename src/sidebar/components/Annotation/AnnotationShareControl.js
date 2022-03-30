import {
  Card,
  Icon,
  IconButton,
  TextInput,
  TextInputWithButton,
  useElementShouldClose,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

import { isShareableURI } from '../../helpers/annotation-sharing';
import { copyText } from '../../util/copy-to-clipboard';
import { isPrivate } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import { isIOS } from '../../../shared/user-agent';

import ShareLinks from '../ShareLinks';

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/api').Group} Group
 */

/**
 * @typedef AnnotationShareControlProps
 * @prop {Annotation} annotation - The annotation in question
 * @prop {Group} [group] -
 *  Group that the annotation is in. If missing, this component will not render.
 *  FIXME: Refactor after root cause is addressed.
 *  See https://github.com/hypothesis/client/issues/1542
 * @prop {string} shareUri - The URI to view the annotation on its own
 * @prop {import('../../services/toast-messenger').ToastMessengerService} toastMessenger
 */

function selectionOverflowsInputElement() {
  // On iOS the selection overflows the input element
  // See: https://github.com/hypothesis/client/pull/2799
  return isIOS();
}

/**
 *
 * @param {object} props
 *   @param {string} [props.classes] - Optional additional CSS classes
 */
function MenuArrowDown({ classes }) {
  return (
    <Icon
      name="pointer"
      classes={classnames(
        'absolute inline z-2 text-grey-3 fill-white rotate-180',
        classes
      )}
    />
  );
}

/**
 * "Popup"-style component for sharing a single annotation.
 *
 * @param {AnnotationShareControlProps} props
 */
function AnnotationShareControl({
  annotation,
  toastMessenger,
  group,
  shareUri,
}) {
  const annotationIsPrivate = isPrivate(annotation.permissions);
  const inContextAvailable = isShareableURI(annotation.uri);
  const shareRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

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

  // FIXME: See https://github.com/hypothesis/client/issues/1542
  if (!group) {
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
    <div className="relative" ref={shareRef}>
      <IconButton
        icon="share"
        title="Share"
        onClick={toggleSharePanel}
        expanded={isOpen}
      />
      {isOpen && (
        <Card
          classes={classnames(
            // Prefer width 96 (24rem) but ensure that component isn't wider
            // than 85vw
            'w-96 max-w-[85vw]',
            // Position this Card above its IconButton. Account for larger
            // IconButtons in touch interfaces
            'absolute bottom-8 right-1 touch:bottom-touch-minimum',
            'space-y-2 p-2',
            // Cards do not have a border in the clean theme. Turn it back on.
            'theme-clean:border'
          )}
        >
          <div className="flex items-center">
            <h2 className="text-brand text-lg font-medium">
              Share this annotation
            </h2>
          </div>
          <div
            className={classnames(
              // Slightly larger font size for touch devices to correspond with
              // larger button and input sizes
              'flex w-full text-sm touch:text-base'
            )}
          >
            <TextInputWithButton>
              <TextInput
                aria-label="Use this URL to share this annotation"
                type="text"
                value={shareUri}
                readOnly
                inputRef={inputRef}
              />
              <IconButton
                icon="copy"
                title="Copy share link to clipboard"
                onClick={copyShareLink}
                variant="dark"
              />
            </TextInputWithButton>
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
          {showShareLinks && <ShareLinks shareURI={shareUri} />}
          <MenuArrowDown classes="bottom-[-12px] right-1 touch:right-[9px]" />
        </Card>
      )}
    </div>
  );
}

export default withServices(AnnotationShareControl, ['toastMessenger']);
