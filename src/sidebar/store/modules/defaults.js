import * as util from '../util';

/**
 * A store module pertaining to client-side defaults for (browser) users.
 */

function init(settings, persistedDefaults) {
  // Initialize state from any available persisted default values
  return {
    annotationPrivacy: persistedDefaults.annotationPrivacy || 'shared',
  };
}

const update = {
  SET_DEFAULT: function(state, action) {
    return { [action.defaultKey]: action.value };
  },
};

const actions = util.actionTypes(update);

function setDefault(defaultKey, value) {
  return { type: actions.SET_DEFAULT, defaultKey: defaultKey, value: value };
}

/** Selectors */
function getDefault(state, defaultKey) {
  return state.defaults[defaultKey];
}

function getDefaults(state) {
  return state.defaults;
}

export default {
  init: init,
  namespace: 'defaults',
  update: update,
  actions: {
    setDefault,
  },

  selectors: {
    getDefault,
    getDefaults,
  },
};
