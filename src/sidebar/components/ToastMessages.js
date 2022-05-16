import classnames from 'classnames';
import { Card, Icon, Link } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../store';
import { withServices } from '../service-context';

/**
 * @typedef {import('../store/modules/toast-messages').ToastMessage} ToastMessage
 */

/**
 * @typedef ToastMessageProps
 * @prop {ToastMessage} message - The message object to render
 * @prop {(id: string) => void} onDismiss
 */

/**
 * An individual toast message: a brief and transient success or error message.
 * The message may be dismissed by clicking on it. `visuallyHidden` toast
 * messages will not be visible but are still available to screen readers.
 *
 * Otherwise, the `toastMessenger` service handles removing messages after a
 * certain amount of time.
 *
 * @param {ToastMessageProps} props
 */
function ToastMessage({ message, onDismiss }) {
  // Capitalize the message type for prepending; Don't prepend a message
  // type for "notice" messages
  const prefix =
    message.type !== 'notice'
      ? `${message.type.charAt(0).toUpperCase() + message.type.slice(1)}: `
      : '';
  const iconName = message.type === 'notice' ? 'cancel' : message.type;
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
      classes={classnames('p-0 flex border', {
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
          name={iconName}
          classes={classnames(
            // Adjust alignment of icon to appear more aligned with text
            'mt-[2px]'
          )}
        />
      </div>
      <div
        className={classnames(
          // TODO: After re-factoring of Card styling, `mt-0` should not need
          // !important
          'grow p-3 !mt-0'
        )}
        data-testid="toast-message-text"
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
            >
              More info
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * @typedef ToastMessagesProps
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 *
 * @param {ToastMessagesProps} props
 */
function ToastMessages({ toastMessenger }) {
  const store = useSidebarStore();
  const messages = store.getToastMessages();
  // The `ul` containing any toast messages is absolute-positioned and the full
  // width of the viewport. Each toast message `li` has its position and width
  // constrained by `container` configuration in tailwind.
  return (
    <div>
      <ul
        aria-live="polite"
        aria-relevant="additions"
        className="absolute z-2 left-0 w-full space-y-2"
      >
        {messages.map(message => (
          <li
            className={classnames(
              'relative w-full container hover:cursor-pointer',
              {
                // Slide in from right in narrow viewports; fade in in
                // larger viewports to toast message isn't flying too far
                'motion-safe:animate-slide-in-from-right lg:animate-fade-in':
                  !message.isDismissed,
                // Only ever fade in if motion-reduction is preferred
                'motion-reduce:animate-fade-in': !message.isDismissed,
                'animate-fade-out': message.isDismissed,
              }
            )}
            key={message.id}
          >
            <ToastMessage
              message={message}
              onDismiss={id => toastMessenger.dismiss(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default withServices(ToastMessages, ['toastMessenger']);
