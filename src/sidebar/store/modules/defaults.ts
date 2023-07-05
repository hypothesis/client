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

export type State = {
  annotationPrivacy: 'private' | 'shared' | null;
  focusedGroup: string | null;
};

export type Key = keyof State;

const initialState: State = {
  annotationPrivacy: null,
  focusedGroup: null,
};

const reducers = {
  SET_DEFAULT(state: State, action: { defaultKey: Key; value: string | null }) {
    return { [action.defaultKey]: action.value };
  },
};

function setDefault(defaultKey: Key, value: string | null) {
  return makeAction(reducers, 'SET_DEFAULT', { defaultKey, value });
}

/** Selectors */

/**
 * Retrieve the state's current value for `defaultKey`.
 */
function getDefault(state: State, defaultKey: Key) {
  return state[defaultKey];
}

function getDefaults(state: State) {
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
