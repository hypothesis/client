'use strict';

const events = require('../shared/bridge-events');

let _features = {};

const _set = (features) => {
  _features = features || {};
};


module.exports = {

  init: function(crossframe) {
    crossframe.on(events.FEATURE_FLAGS_UPDATED, _set);
  },

  reset: function() {
    _set({});
  },

  flagEnabled: function(flag) {
    if (!(flag in _features)) {
      console.warn('looked up unknown feature', flag);
      return false;
    }
    return _features[flag];
  },

};
