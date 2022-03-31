import { createStoreModule, makeAction } from '../create-store';

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

const initialState = {
  annotationPrivacy: /** @type {'private'|'shared'|null} */ (null),
  focusedGroup: /** @type {string|null} */ (null),
};

/**
 * @typedef {keyof initialState} Key
 * @typedef {typeof initialState} State
 */

const reducers = {
  /**
   * @param {State} state
   * @param {{ defaultKey: Key, value: string|null }} action
   */
  SET_DEFAULT(state, action) {
    return { [action.defaultKey]: action.value };
  },
};

/**
 * @param {Key} defaultKey
 * @param {string|null} value
 */
function setDefault(defaultKey, value) {
  return makeAction(reducers, 'SET_DEFAULT', { defaultKey, value });
}

/** Selectors */

/**
 * Retrieve the state's current value for `defaultKey`.
 *
 * @param {State} state
 * @param {Key} defaultKey
 */
function getDefault(state, defaultKey) {
  return state[defaultKey];
}

/** @param {State} state */
function getDefaults(state) {
  return state;
}

export const defaultsModule = createStoreModule(initialState, {
  namespace: 'defaults',
  reducers,
  actionCreators: {
    setDefault,
  },
  selectors: {
    getDefault,
    getDefaults,
  },
});
