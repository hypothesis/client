'use strict';

/**
 * @class
 * Syncs annotation events between the sidebar app and Annotator.
 *
 * Listens for events from the sidebar app indicating that annotations have
 * been added or removed and relays them to Annotator.
 *
 * Also listens for events from Annotator when new annotations are created
 * and relays these to the sidebar app.
 *
 * @param bridge - The bridge.
 *
 * @param {Object} options - A required options object containing two required
 *   properties `on` and `emit`.
 *
 *   `on` must be a callback function that will be called when a new annotion
 *   is created by the Annotator code.
 *
 *   `emit` must be a callback function that will be called when an event
 *   (such as "annotationDeleted" or "annotationsLoaded") is received from
 *   the sidebar app.
 *
 */
function AnnotationSync(bridge, options) {
  var event;
  var func;
  var handler;
  var method;
  var ref;
  var ref1;

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

  // Listen locally for interesting events.
  this._on('beforeAnnotationCreated', this._beforeAnnotationCreated.bind(this));

  // Register remotely invokable methods.
  ref1 = this._channelListeners;
  for (method in ref1) {
    if (Object.prototype.hasOwnProperty.call(ref1, method))  {
      func = ref1[method];
      this.bridge.on(method, func.bind(this));
    }
  }
}

/** Cache of annotations which have crossed the bridge for fast, encapsulated
  * association of annotations received in arguments to window-local copies. */
AnnotationSync.prototype.cache = null;

AnnotationSync.prototype.sync = function(annotations) {
  var a;
  annotations = (function() {
    var i;
    var len;
    var results1;

    results1 = [];
    for (i = 0, len = annotations.length; i < len; i++) {
      a = annotations[i];
      results1.push(this._format(a));
    }
    return results1;
  }).call(this);
  this.bridge.call('sync', annotations, (function(_this) {
    return function(err, annotations) {
      var i;
      var len;
      var results1;

      if (annotations === null) {
        annotations = [];
      }
      results1 = [];
      for (i = 0, len = annotations.length; i < len; i++) {
        a = annotations[i];
        results1.push(_this._parse(a));
      }
      return results1;
    };
  })(this));
  return this;
};

/** An object mapping event name strings to handler functions.
 *
 *  These are the handler functions for events received from the sidebar app.
 */
AnnotationSync.prototype._channelListeners = {
  'deleteAnnotation': function(body, cb) {
    var annotation;
    annotation = this._parse(body);
    delete this.cache[annotation.$tag];
    this._emit('annotationDeleted', annotation);
    cb(null, this._format(annotation));
  },
  'loadAnnotations': function(bodies, cb) {
    var a;
    var annotations;

    annotations = (function() {
      var i;
      var len;
      var results1;

      results1 = [];
      for (i = 0, len = bodies.length; i < len; i++) {
        a = bodies[i];
        results1.push(this._parse(a));
      }
      return results1;
    }).call(this);
    this._emit('annotationsLoaded', annotations);
    return cb(null, annotations);
  },
};

AnnotationSync.prototype._beforeAnnotationCreated = function(annotation) {
  if (annotation.$tag) {
    return;
  }

  // Wrap the callback function to first parse returned items.
  var wrappedCallback = function(failure, results) {
    if (failure === null) {
      this._parseResults(results);
    }
  };

  // Call the remote method.
  this.bridge.call(
    'beforeCreateAnnotation', this._format(annotation), wrappedCallback);
}

// Parse returned message bodies to update cache with any changes made remotely
// When we make a call remotely, we get "results" back.
// This parses those results.
// The "results" are a list of "bodies" and this returns the result of parsing
// each body with _parse() below.
AnnotationSync.prototype._parseResults = function(results) {
  var bodies;
  var body;
  var i;
  var j;
  var len;
  var len1;

  for (i = 0, len = results.length; i < len; i++) {
    bodies = results[i];
    bodies = [].concat(bodies);
    for (j = 0, len1 = bodies.length; j < len1; j++) {
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
  var local;
  var merged;
  var remote;

  local = this.cache[body.tag];
  remote = body.msg;
  merged = Object.assign(local || {}, remote);
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
