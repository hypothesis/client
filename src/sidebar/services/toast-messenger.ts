import { generateHexString } from '../../shared/random';
import type { SidebarStore } from '../store';

// How long toast messages should be displayed before they are dismissed, in ms
const MESSAGE_DISPLAY_TIME = 5000;
// Delay before removing the message entirely (allows animations to complete)
const MESSAGE_DISMISS_DELAY = 500;

/**
 * Additional control over the display of a particular message.
 */
type MessageOptions = {
  /** Whether the toast message automatically disappears. */
  autoDismiss?: boolean;
  /** Optional URL for users to visit for "more info" */
  moreInfoURL?: string;

  /**
   * When `true`, message will be visually hidden but still available to screen
   * readers.
   */
  visuallyHidden?: boolean;
};

/**
 * A service for managing toast messages. The service will auto-dismiss and
 * remove toast messages created with `#success()` or `#error()`. Added
 * messages may be manually dismissed with the `#dismiss()` method.
 */
// @inject
export class ToastMessengerService {
  private _store: SidebarStore;

  constructor(store: SidebarStore) {
    this._store = store;
  }

  /**
   * Update a toast message's dismiss status and set a timeout to remove
   * it after a bit. This allows effects/animations to happen before the
   * message is removed entirely.
   *
   * @param messageId - The value of the `id` property for the message that is
   *                    to be dismissed.
   */
  dismiss(messageId: string) {
    const message = this._store.getToastMessage(messageId);
    if (message && !message.isDismissed) {
      this._store.updateToastMessage({ ...message, isDismissed: true });
      setTimeout(() => {
        this._store.removeToastMessage(messageId);
      }, MESSAGE_DISMISS_DELAY);
    }
  }

  /**
   * Add a new toast message to the store and set a timeout to dismiss it
   * after some time. This method will not add a message that is already
   * extant in the store's collection of toast messages (i.e. has the same
   * `type` and `message` text of an existing message).
   */
  private _addMessage(
    type: 'error' | 'success' | 'notice',
    messageText: string,
    {
      autoDismiss = true,
      moreInfoURL = '',
      visuallyHidden = false,
    }: MessageOptions = {}
  ) {
    // Do not add duplicate messages (messages with the same type and text)
    if (this._store.hasToastMessage(type, messageText)) {
      return;
    }

    const id = generateHexString(10);
    const message = {
      type,
      id,
      message: messageText,
      moreInfoURL,
      visuallyHidden,
    };

    this._store.addToastMessage({
      isDismissed: false,
      ...message,
    });

    if (autoDismiss) {
      // Attempt to dismiss message after a set time period. NB: The message may
      // have been removed by other mechanisms at this point; do not assume its
      // presence.
      setTimeout(() => {
        this.dismiss(id);
      }, MESSAGE_DISPLAY_TIME);
    }
  }

  /**
   * Add an error toast message with `messageText`
   */
  error(messageText: string, options?: MessageOptions) {
    this._addMessage('error', messageText, options);
  }

  /**
   * Add a success toast message with `messageText`
   */
  success(messageText: string, options?: MessageOptions) {
    this._addMessage('success', messageText, options);
  }

  /**
   * Add a warn/notice toast message with `messageText`
   */
  notice(messageText: string, options?: MessageOptions) {
    this._addMessage('notice', messageText, options);
  }
}
