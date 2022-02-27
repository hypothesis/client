import { warnOnce } from '../shared/warn-once';

/** @type {Record<string, boolean>} */
let _features = {};

/** @param {Record<string, boolean>} features */
const _set = features => {
  _features = features || {};
};

export const features = {
  /**
   * @param {import('../shared/messaging').PortRPC<'featureFlagsUpdated', string>} rpc - Channel for host-sidebar communication
   */
  init: function (rpc) {
    rpc.on('featureFlagsUpdated', _set);
  },

  reset: function () {
    _set({});
  },

  /** @param {string} flag */
  flagEnabled: function (flag) {
    if (!(flag in _features)) {
      warnOnce('looked up unknown feature', flag);
      return false;
    }
    return _features[flag];
  },
};
