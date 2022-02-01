import { warnOnce } from '../shared/warn-once';

let _features = {};

const _set = features => {
  _features = features || {};
};

export const features = {
  /**
   * @param {import('../shared/messaging').PortRPC} rpc - Channel for host-sidebar communication
   */
  init: function (rpc) {
    rpc.on('featureFlagsUpdated', _set);
  },

  reset: function () {
    _set({});
  },

  flagEnabled: function (flag) {
    if (!(flag in _features)) {
      warnOnce('looked up unknown feature', flag);
      return false;
    }
    return _features[flag];
  },
};
