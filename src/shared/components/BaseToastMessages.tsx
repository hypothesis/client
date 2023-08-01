import { Callout, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

export type ToastMessage = {
  type: 'error' | 'success' | 'notice';
  id: string;
  message: string;
  moreInfoURL: string;
  isDismissed: boolean;
  visuallyHidden: boolean;
};

type ToastMessageItemProps = {
  message: ToastMessage;
  onDismiss: (id: string) => void;
};

/**
 * An individual toast message: a brief and transient success or error message.
 * The message may be dismissed by clicking on it. `visuallyHidden` toast
 * messages will not be visible but are still available to screen readers.
 */
function ToastMessageItem({ message, onDismiss }: ToastMessageItemProps) {
  // Capitalize the message type for prepending; Don't prepend a message
  // type for "notice" messages
  const prefix =
    message.type !== 'notice'
      ? `${message.type.charAt(0).toUpperCase() + message.type.slice(1)}: `
      : '';

  /**
   * There is a click-to-remove handler on a non-interactive element. This
   * allows sighted users to get the toast message out of their way if it
   * interferes with interacting with the underlying components. This shouldn't
   * pose the same irritation to users with screen- readers as the rendered
   * toast messages shouldn't impede interacting with the underlying document.
   */
  return (
    <Callout
      classes={classnames({
        'sr-only': message.visuallyHidden,
      })}
      status={message.type}
      onClick={() => onDismiss(message.id)}
      variant="raised"
    >
      <strong>{prefix}</strong>
      {message.message}
      {message.moreInfoURL && (
        <div className="text-right">
          <Link
            href={message.moreInfoURL}
            onClick={
              event =>
                event.stopPropagation() /* consume the event so that it does not dismiss the message */
            }
            target="_new"
            underline="none"
          >
            More info
          </Link>
        </div>
      )}
    </Callout>
  );
}

export type BaseToastMessageProps = {
  messages: ToastMessage[];
  onMessageDismiss: (messageId: string) => void;
};

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 */
export default function BaseToastMessages({
  messages,
  onMessageDismiss,
}: BaseToastMessageProps) {
  // The `ul` containing any toast messages is absolute-positioned and the full
  // width of the viewport. Each toast message `li` has its position and width
  // constrained by `container` configuration in tailwind.
  return (
    <div>
      <ul
        aria-live="polite"
        aria-relevant="additions"
        className={classnames(
          // Set an aggressive z-index as we want to ensure toast messages are
          // rendered above other content
          'z-10',
          'absolute left-0 w-full',
        )}
      >
        {messages.map(message => (
          <li
            className={classnames('relative w-full container', {
              // Add a bottom margin to visible messages only. Typically, we'd
              // use a `space-y-2` class on the parent to space children.
              // Doing that here could cause an undesired top margin on
              // the first visible message in a list that contains (only)
              // visually-hidden messages before it.
              // See https://tailwindcss.com/docs/space#limitations
              'mb-2': !message.visuallyHidden,
              // Slide in from right in narrow viewports; fade in larger
              // viewports to toast message isn't flying too far
              'motion-safe:animate-slide-in-from-right lg:animate-fade-in':
                !message.isDismissed,
              // Only ever fade in if motion-reduction is preferred
              'motion-reduce:animate-fade-in': !message.isDismissed,
              'animate-fade-out': message.isDismissed,
            })}
            key={message.id}
          >
            <ToastMessageItem message={message} onDismiss={onMessageDismiss} />
          </li>
        ))}
      </ul>
    </div>
  );
}
