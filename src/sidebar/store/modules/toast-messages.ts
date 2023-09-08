import type { ToastMessage } from '../../../shared/components/BaseToastMessages';
import { createStoreModule, makeAction } from '../create-store';

/**
 * A store module for managing a collection of toast messages. This module
 * maintains state only; it's up to other layers to handle the management
 * and interactions with these messages.
 */

export type State = {
  messages: ToastMessage[];
};

const initialState: State = {
  messages: [],
};

const reducers = {
  ADD_MESSAGE(state: State, action: { message: ToastMessage }) {
    return {
      messages: state.messages.concat({ ...action.message }),
    };
  },

  REMOVE_MESSAGE(state: State, action: { id: string }) {
    const updatedMessages = state.messages.filter(
      message => message.id !== action.id,
    );
    return { messages: updatedMessages };
  },

  UPDATE_MESSAGE(state: State, action: { message: ToastMessage }) {
    const updatedMessages = state.messages.map(message => {
      if (message.id && message.id === action.message.id) {
        return { ...action.message };
      }
      return message;
    });
    return { messages: updatedMessages };
  },
};

/** Actions */

function addMessage(message: ToastMessage) {
  return makeAction(reducers, 'ADD_MESSAGE', { message });
}

/**
 * Remove the `message` with the corresponding `id` property value.
 */
function removeMessage(id: string) {
  return makeAction(reducers, 'REMOVE_MESSAGE', { id });
}

/**
 * Update the `message` object (lookup is by `id`).
 */
function updateMessage(message: ToastMessage) {
  return makeAction(reducers, 'UPDATE_MESSAGE', { message });
}

/** Selectors */

/**
 * Retrieve a message by `id`
 */
function getMessage(state: State, id: string) {
  return state.messages.find(message => message.id === id);
}

/**
 * Retrieve all current messages
 */
function getMessages(state: State) {
  return state.messages;
}

/**
 * Return boolean indicating whether a message with the same type and message
 * text exists in the state's collection of messages. This matches messages
 * by content, not by ID (true uniqueness).
 */
function hasMessage(state: State, type: ToastMessage['type'], text: string) {
  return state.messages.some(message => {
    return message.type === type && message.message === text;
  });
}

export const toastMessagesModule = createStoreModule(initialState, {
  namespace: 'toastMessages',
  reducers,
  actionCreators: {
    addToastMessage: addMessage,
    removeToastMessage: removeMessage,
    updateToastMessage: updateMessage,
  },
  selectors: {
    getToastMessage: getMessage,
    getToastMessages: getMessages,
    hasToastMessage: hasMessage,
  },
});
