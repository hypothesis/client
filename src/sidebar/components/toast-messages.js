import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';
import useStore from '../store/use-store';

import Button from './button';
import SvgIcon from './svg-icon';

function ToastMessage({ message }) {
  const prefix = message.type.charAt(0).toUpperCase() + message.type.slice(1);
  return (
    <li
      className={classnames('toast-message', `toast-message--${message.type}`)}
      key={message.id}
    >
      <div className="toast-message__row">
        <div className="toast-message__type">
          <SvgIcon name={message.type} />
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
  message: propTypes.object.isRequired,
};

/**
 *
 */
function ToastMessages({ toastMessagesService }) {
  const messages = useStore(store => store.getToastMessages());

  const addSuccessMessage = () => {
    toastMessagesService.success('This is a message');
  };

  const addErrorMessage = () => {
    toastMessagesService.error('This is a message');
  };

  return (
    <div>
      <Button buttonText="Add success message" onClick={addSuccessMessage} />
      <Button buttonText="Add error message" onClick={addErrorMessage} />
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

ToastMessages.propTypes = {
  toastMessagesService: propTypes.object.isRequired,
};

ToastMessages.injectedProps = ['toastMessagesService'];

export default withServices(ToastMessages);
