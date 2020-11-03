/**
 * A service for managing toast messages. The service will auto-dismiss and
 * remove toast messages created with `#success()` or `#error()`. Added
 * messages may be manually dismissed with the `#dismiss()` method.
 */
import { generateHexString } from '../util/random';

// How long toast messages should be displayed before they are dismissed, in ms
const MESSAGE_DISPLAY_TIME = 5000;
// Delay before removing the message entirely (allows animations to complete)
const MESSAGE_DISMISS_DELAY = 500;

/**
 * Additional control over the display of a particular message.
 *
 * @typedef {Object} MessageOptions
 * @prop {boolean} [autoDismiss=true] - Whether the toast message automatically disappears.
 * @prop {string} [moreInfoURL=''] - Optional URL for users to visit for "more info"
 */

// @inject
export default function toastMessenger(store) {
  /**
   * Update a toast message's dismiss status and set a timeout to remove
   * it after a bit. This allows effects/animations to happen before the
   * message is removed entirely.
   *
   * @param {string} messageId - The value of the `id` property for the
   *                             message that is to be dismissed.
   */
  const dismiss = messageId => {
    const message = store.getToastMessage(messageId);
    if (message && !message.isDismissed) {
      store.updateToastMessage({ ...message, isDismissed: true });
      setTimeout(() => {
        store.removeToastMessage(messageId);
      }, MESSAGE_DISMISS_DELAY);
    }
  };

  /**
   * Add a new toast message to the store and set a timeout to dismiss it
   * after some time. This method will not add a message that is already
   * extant in the store's collection of toast messages (i.e. has the same
   * `type` and `message` text of an existing message).
   *
   * @param {('error'|'success'|'notice')} type
   * @param {string} messageText - The message to be rendered
   * @param {MessageOptions} [options]
   */
  const addMessage = (
    type,
    messageText,
    { autoDismiss = true, moreInfoURL = '' } = {}
  ) => {
    // Do not add duplicate messages (messages with the same type and text)
    if (store.hasToastMessage(type, messageText)) {
      return;
    }

    const id = generateHexString(10);
    const message = { type, id, message: messageText, moreInfoURL };

    store.addToastMessage({
      isDismissed: false,
      ...message,
    });

    if (autoDismiss) {
      // Attempt to dismiss message after a set time period. NB: The message may
      // have been removed by other mechanisms at this point; do not assume its
      // presence.
      setTimeout(() => {
        dismiss(id);
      }, MESSAGE_DISPLAY_TIME);
    }
  };

  /**
   * Add an error toast message with `messageText`
   *
   * @param {string} messageText
   * @param {MessageOptions} options
   */
  const error = (messageText, options) => {
    addMessage('error', messageText, options);
  };

  /**
   * Add a success toast message with `messageText`
   *
   * @param {string} messageText
   * @param {MessageOptions} options
   */
  const success = (messageText, options) => {
    addMessage('success', messageText, options);
  };

  /**
   * Add a warn/notice toast message with `messageText`
   *
   * @param {string} messageText
   * @param {MessageOptions} options
   */
  const notice = (messageText, options) => {
    addMessage('notice', messageText, options);
  };

  return {
    dismiss,
    error,
    success,
    notice,
  };
}
