/**
 * A service for managing toast messages.
 */
import { generateHexString } from '../util/random';

const MESSAGE_DISPLAY_TIME = 5000;

// @ngInject
export default function toastMessagesService(store) {
  const addMessage = (type, message) => {
    // Do not add duplicate messages (messages with the same type and text)
    if (store.hasToastMessage(type, message)) {
      return;
    }

    const id = generateHexString(10);

    store.addToastMessage({ type, message, id });

    // Attempt to remove message after a set time period. NB: The message may
    // have been removed by other mechanisms at this point; do not assume its
    // presence.
    setTimeout(() => {
      store.removeToastMessage(id);
    }, MESSAGE_DISPLAY_TIME);
  };

  /**
   * Add an error toast message with `messageText`
   */
  const error = messageText => {
    addMessage('error', messageText);
  };

  /**
   * Add a success toast message with `messageText`
   */
  const success = messageText => {
    addMessage('success', messageText);
  };

  return {
    error,
    success,
  };
}
