import * as util from '../util';

import { storeModule } from '../create-store';

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

function initialState() {
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

const reducers = {
  SET_DEFAULT: function (state, action) {
    return { [action.defaultKey]: action.value };
  },
};

const actions = util.actionTypes(reducers);

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

export default storeModule({
  initialState,
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
