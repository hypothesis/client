import {
  Card,
  Link,
  CancelIcon,
  CautionIcon,
  CheckIcon,
} from '@hypothesis/frontend-shared/lib/next';
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

  let Icon;
  switch (message.type) {
    case 'success':
      Icon = CheckIcon;
      break;
    case 'error':
      Icon = CancelIcon;
      break;
    case 'notice':
    default:
      Icon = CautionIcon;
      break;
  }
  /**
   * a11y linting is disabled here: There is a click-to-remove handler on a
   * non-interactive element. This allows sighted users to get the toast message
   * out of their way if it interferes with interacting with the underlying
   * components. This shouldn't pose the same irritation to users with screen-
   * readers as the rendered toast messages shouldn't impede interacting with
   * the underlying document.
   */
  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <Card
      classes={classnames('flex', {
        'sr-only': message.visuallyHidden,
        'border-red-error': message.type === 'error',
        'border-yellow-notice': message.type === 'notice',
        'border-green-success': message.type === 'success',
      })}
      onClick={() => onDismiss(message.id)}
    >
      <div
        className={classnames('flex items-center p-3 text-white', {
          'bg-red-error': message.type === 'error',
          'bg-yellow-notice': message.type === 'notice',
          'bg-green-success': message.type === 'success',
        })}
      >
        <Icon
          className={classnames(
            // Adjust alignment of icon to appear more aligned with text
            'mt-[2px]'
          )}
        />
      </div>
      <div className="grow p-3" data-testid="toast-message-text">
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
            >
              More info
            </Link>
          </div>
        )}
      </div>
    </Card>
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
        className="absolute z-2 left-0 w-full"
      >
        {messages.map(message => (
          <li
            className={classnames(
              'relative w-full container hover:cursor-pointer',
              {
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
              }
            )}
            key={message.id}
          >
            <ToastMessageItem message={message} onDismiss={onMessageDismiss} />
          </li>
        ))}
      </ul>
    </div>
  );
}
