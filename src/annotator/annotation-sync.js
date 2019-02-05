'use strict';

// AnnotationSync listens for messages from the sidebar app indicating that
// annotations have been added or removed and relays them to Guest.
//
// It also listens for events from Guest when new annotations are created or
// annotations successfully anchor and relays these to the sidebar app.
function AnnotationSync(bridge, options) {
  const self = this;

  this.bridge = bridge;

  if (!options.on) {
    throw new Error('options.on unspecified for AnnotationSync.');
  }

  if (!options.emit) {
    throw new Error('options.emit unspecified for AnnotationSync.');
  }

  this.cache = {};

  this._on = options.on;
  this._emit = options.emit;

  // Listen locally for interesting events
  Object.keys(this._eventListeners).forEach(function(eventName) {
    const listener = self._eventListeners[eventName];
    self._on(eventName, function(annotation) {
      listener.apply(self, [annotation]);
    });
  });

  // Register remotely invokable methods
  Object.keys(this._channelListeners).forEach(function(eventName) {
    self.bridge.on(eventName, function(data, callbackFunction) {
      const listener = self._channelListeners[eventName];
      listener.apply(self, [data, callbackFunction]);
    });
  });
}

// Cache of annotations which have crossed the bridge for fast, encapsulated
// association of annotations received in arguments to window-local copies.
AnnotationSync.prototype.cache = null;

AnnotationSync.prototype.sync = function(annotations) {
  annotations = function() {
    let i;
    const formattedAnnotations = [];

    for (i = 0; i < annotations.length; i++) {
      formattedAnnotations.push(this._format(annotations[i]));
    }
    return formattedAnnotations;
  }.call(this);
  this.bridge.call(
    'sync',
    annotations,
    (function(_this) {
      return function(err, annotations) {
        let i;
        const parsedAnnotations = [];
        annotations = annotations || [];

        for (i = 0; i < annotations.length; i++) {
          parsedAnnotations.push(_this._parse(annotations[i]));
        }
        return parsedAnnotations;
      };
    })(this)
  );
  return this;
};

// Handlers for messages arriving through a channel
AnnotationSync.prototype._channelListeners = {
  deleteAnnotation: function(body, cb) {
    const annotation = this._parse(body);
    delete this.cache[annotation.$tag];
    this._emit('annotationDeleted', annotation);
    cb(null, this._format(annotation));
  },
  loadAnnotations: function(bodies, cb) {
    const annotations = function() {
      let i;
      const parsedAnnotations = [];

      for (i = 0; i < bodies.length; i++) {
        parsedAnnotations.push(this._parse(bodies[i]));
      }
      return parsedAnnotations;
    }.call(this);
    this._emit('annotationsLoaded', annotations);
    return cb(null, annotations);
  },
};

// Handlers for events coming from this frame, to send them across the channel
AnnotationSync.prototype._eventListeners = {
  beforeAnnotationCreated: function(annotation) {
    if (annotation.$tag) {
      return undefined;
    }
    return this._mkCallRemotelyAndParseResults('beforeCreateAnnotation')(
      annotation
    );
  },
};

AnnotationSync.prototype._mkCallRemotelyAndParseResults = function(
  method,
  callBack
) {
  return (function(_this) {
    return function(annotation) {
      // Wrap the callback function to first parse returned items
      const wrappedCallback = function(failure, results) {
        if (failure === null) {
          _this._parseResults(results);
        }
        if (typeof callBack === 'function') {
          callBack(failure, results);
        }
      };
      // Call the remote method
      _this.bridge.call(method, _this._format(annotation), wrappedCallback);
    };
  })(this);
};

// Parse returned message bodies to update cache with any changes made remotely
AnnotationSync.prototype._parseResults = function(results) {
  let bodies;
  let body;
  let i;
  let j;

  for (i = 0; i < results.length; i++) {
    bodies = results[i];
    bodies = [].concat(bodies);
    for (j = 0; j < bodies.length; j++) {
      body = bodies[j];
      if (body !== null) {
        this._parse(body);
      }
    }
  }
};

// Assign a non-enumerable tag to objects which cross the bridge.
// This tag is used to identify the objects between message.
AnnotationSync.prototype._tag = function(ann, tag) {
  if (ann.$tag) {
    return ann;
  }
  tag = tag || window.btoa(Math.random());
  Object.defineProperty(ann, '$tag', {
    value: tag,
  });
  this.cache[tag] = ann;
  return ann;
};

// Parse a message body from a RPC call with the provided parser.
AnnotationSync.prototype._parse = function(body) {
  const merged = Object.assign(this.cache[body.tag] || {}, body.msg);
  return this._tag(merged, body.tag);
};

// Format an annotation into an RPC message body with the provided formatter.
AnnotationSync.prototype._format = function(ann) {
  this._tag(ann);
  return {
    tag: ann.$tag,
    msg: ann,
  };
};

module.exports = AnnotationSync;
