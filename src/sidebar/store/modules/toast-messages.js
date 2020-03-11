import * as util from '../util';

/**
 *
 */

function init() {
  /**
   */
  return {
    messages: [],
  };
}

const update = {
  REMOVE_MESSAGE: function(state, action) {
    const updatedMessages = state.messages.filter(
      message => message.id !== action.id
    );
    return { messages: updatedMessages };
  },
  SET_MESSAGE: function(state, action) {
    return { messages: state.messages.concat([action.message]) };
  },
};

const actions = util.actionTypes(update);

function addMessage(message) {
  return { type: actions.SET_MESSAGE, message };
}

function removeMessage(id) {
  return { type: actions.REMOVE_MESSAGE, id };
}

/** Selectors */
function getMessages(state) {
  return state.toastMessages.messages;
}

export default {
  init,
  namespace: 'toastMessages',
  update,
  actions: {
    addToastMessage: addMessage,
    removeToastMessage: removeMessage,
  },
  selectors: {
    getToastMessages: getMessages,
  },
};
