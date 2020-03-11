/**
 * A service for...
 */
import { generateHexString } from '../util/random';

const MESSAGE_DISPLAY_TIME = 5000;

// @ngInject
export default function toastMessagesService(store) {
  const addMessage = (type, message) => {
    const messageId = generateHexString(10);
    store.addToastMessage({ type: type, message: message, id: messageId });
    setTimeout(() => {
      store.removeToastMessage(messageId);
    }, MESSAGE_DISPLAY_TIME);
  };

  const error = message => {
    addMessage('error', message);
  };

  const success = message => {
    addMessage('success', message);
  };

  return {
    error,
    success,
  };
}
