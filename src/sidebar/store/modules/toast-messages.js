import { createStoreModule, makeAction } from '../create-store';

/**
 * @typedef {import('../../../shared/components/BaseToastMessages').ToastMessage} ToastMessage
 */

/**
 * A store module for managing a collection of toast messages. This module
 * maintains state only; it's up to other layers to handle the management
 * and interactions with these messages.
 */

const initialState = {
  /** @type {ToastMessage[]} */
  messages: [],
};

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ message: ToastMessage }} action
   */
  ADD_MESSAGE(state, action) {
    return {
      messages: state.messages.concat({ ...action.message }),
    };
  },

  /**
   * @param {State} state
   * @param {{ id: string }} action
   */
  REMOVE_MESSAGE(state, action) {
    const updatedMessages = state.messages.filter(
      message => message.id !== action.id,
    );
    return { messages: updatedMessages };
  },

  /**
   * @param {State} state
   * @param {{ message: ToastMessage }} action
   */
  UPDATE_MESSAGE(state, action) {
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

/**
 * @param {ToastMessage} message
 */
function addMessage(message) {
  return makeAction(reducers, 'ADD_MESSAGE', { message });
}

/**
 * Remove the `message` with the corresponding `id` property value.
 *
 * @param {string} id
 */
function removeMessage(id) {
  return makeAction(reducers, 'REMOVE_MESSAGE', { id });
}

/**
 * Update the `message` object (lookup is by `id`).
 *
 * @param {ToastMessage} message
 */
function updateMessage(message) {
  return makeAction(reducers, 'UPDATE_MESSAGE', { message });
}

/** Selectors */

/**
 * Retrieve a message by `id`
 *
 * @param {State} state
 * @param {string} id
 */
function getMessage(state, id) {
  return state.messages.find(message => message.id === id);
}

/**
 * Retrieve all current messages
 *
 * @param {State} state
 */
function getMessages(state) {
  return state.messages;
}

/**
 * Return boolean indicating whether a message with the same type and message
 * text exists in the state's collection of messages. This matches messages
 * by content, not by ID (true uniqueness).
 *
 * @param {State} state
 * @param {string} type
 * @param {string} text
 */
function hasMessage(state, type, text) {
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
