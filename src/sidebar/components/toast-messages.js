import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { withServices } from '../util/service-context';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * An individual toast message—a brief and transient success or error message.
 * The message may be dismissed by clicking on it.
 * Otherwise, the `toastMessenger` service handles removing messages after a
 * certain amount of time.
 */
function ToastMessage({ message, onDismiss }) {
  // Capitalize the message type for prepending
  const prefix = message.type.charAt(0).toUpperCase() + message.type.slice(1);

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
    <li
      className={classnames('toast-message-container', {
        'is-dismissed': message.isDismissed,
      })}
      onClick={() => onDismiss(message.id)}
    >
      <div
        className={classnames(
          'toast-message',
          `toast-message--${message.type}`
        )}
      >
        <div className="toast-message__type">
          <SvgIcon name={message.type} className="toast-message__icon" />
        </div>
        <div className="toast-message__message">
          <strong>{prefix}: </strong>
          {message.message}
        </div>
      </div>
    </li>
  );
}

ToastMessage.propTypes = {
  // The message object to render
  message: propTypes.object.isRequired,
  onDismiss: propTypes.func,
};

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 */
function ToastMessages({ toastMessenger }) {
  const messages = useStore(store => store.getToastMessages());
  return (
    <div>
      <ul
        aria-live="polite"
        aria-relevant="additions"
        className="toast-messages"
      >
        {messages.map(message => (
          <ToastMessage
            message={message}
            key={message.id}
            onDismiss={toastMessenger.dismiss}
          />
        ))}
      </ul>
    </div>
  );
}

ToastMessages.propTypes = {
  // Injected services
  toastMessenger: propTypes.object.isRequired,
};

ToastMessages.injectedProps = ['toastMessenger'];

export default withServices(ToastMessages);
