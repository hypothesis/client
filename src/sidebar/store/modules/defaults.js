import * as util from '../util';

/**
 * A store module for managing client-side user-convenience defaults.
 *
 * Example: the default privacy level for newly-created annotations
 * (`private` or `shared`). This default is updated when a user selects a
 * different publishing destination (e.g. `Post to [group name]` versus
 * `Post to Only Me`) from the menu rendered by the `AnnotationPublishControl`
 * component.
 *
 * At present, these defaults are persisted between app sessions in `localStorage`,
 * and their retrieval and re-persistence on change is handled in the
 * `persistedDefaults` service.
 */

function init() {
  /**
   * Note that the persisted presence of any of these defaults cannot be
   * guaranteed, so consumers of said defaults should be prepared to handle
   * missing (i.e. `null`) values. As `null` is a sentinal value indicating
   * "not set/unavailable", a `null` value for a default is otherwise invalid.
   */
  return {
    annotationPrivacy: null,
    focusedGroup: null,
  };
}

const update = {
  SET_DEFAULT: function (state, action) {
    return { [action.defaultKey]: action.value };
  },
};

const actions = util.actionTypes(update);

function setDefault(defaultKey, value) {
  return { type: actions.SET_DEFAULT, defaultKey: defaultKey, value: value };
}

/** Selectors */

/**
 * Retrieve the state's current value for `defaultKey`.
 *
 * @return {string|null} - The current value for `defaultKey` or `undefined` if it is not
 *               present
 */
function getDefault(state, defaultKey) {
  return state[defaultKey];
}

function getDefaults(state) {
  return state;
}

/**
 * @typedef DefaultsStore
 *
 * // Actions
 * @prop {typeof setDefault} setDefault
 *
 * // Selectors
 * @prop {(key: string) => string|null} getDefault
 * @prop {() => Object.<string,string|null>} getDefaults
 */

export default {
  init,
  namespace: 'defaults',
  update,
  actions: {
    setDefault,
  },
  selectors: {
    getDefault,
    getDefaults,
  },
};
