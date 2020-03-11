import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';

import SvgIcon from './svg-icon';

function ToastMessage({ message }) {
  const removeMessage = useStore(store => store.removeToastMessage);
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
      className="toast-message-container"
      onClick={() => removeMessage(message.id)}
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
};

/**
 *
 */
function ToastMessages() {
  const messages = useStore(store => store.getToastMessages());
  return (
    <div>
      <ul
        role="status"
        aria-live="polite"
        aria-relevant="additions"
        className="toast-messages"
      >
        {messages.map(message => (
          <ToastMessage message={message} key={message.id} />
        ))}
      </ul>
    </div>
  );
}

ToastMessages.propTypes = {};

export default ToastMessages;
