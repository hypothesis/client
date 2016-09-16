'use strict';

var uuid = require('node-uuid');

var events = require('./events');
var Socket = require('./websocket');

/**
 * Open a new WebSocket connection to the Hypothesis push notification service.
 * Only one websocket connection may exist at a time, any existing socket is
 * closed.
 *
 * @param $rootScope - Scope used to $apply() app state changes
 *                     resulting from WebSocket messages, in order to update
 *                     appropriate watchers.
 * @param annotationMapper - The local annotation store
 * @param groups - The local groups store
 * @param session - Provides access to read and update the session state
 * @param settings - Application settings
 */
// @ngInject
function Streamer($rootScope, annotationMapper, annotationUI, features, groups,
                  session, settings) {
  // The randomly generated session UUID
  var clientId = uuid.v4();

  // The socket instance for this Streamer instance
  var socket;

  // Client configuration messages, to be sent each time a new connection is
  // established.
  var configMessages = {};

  // The streamer maintains a set of pending updates and deletions which have
  // been received via the WebSocket but not yet applied to the contents of the
  // app.
  //
  // This state should be managed as part of the global app state in
  // annotationUI, but that is currently difficult because applying updates
  // requires filtering annotations against the focused group (information not
  // currently stored in the app state) and triggering events in order to update
  // the annotations displayed in the page.

  // Map of ID -> updated annotation for updates that have been received over
  // the WS but not yet applied
  var pendingUpdates = {};
  // Set of IDs of annotations which have been deleted but for which the
  // deletion has not yet been applied
  var pendingDeletions = {};

  function handleAnnotationNotification(message) {
    var action = message.options.action;
    var annotations = message.payload;

    switch (action) {
    case 'create':
    case 'update':
    case 'past':
      annotations.forEach(function (ann) {
        // In the sidebar, only save pending updates for annotations in the
        // focused group, since we only display annotations from the focused
        // group and reload all annotations and discard pending updates
        // when switching groups.
        if (ann.group === groups.focused().id || !annotationUI.isSidebar()) {
          pendingUpdates[ann.id] = ann;
        }
      });
      break;
    case 'delete':
      annotations.forEach(function (ann) {
        // Discard any pending but not-yet-applied updates for this annotation
        delete pendingUpdates[ann.id];

        // If we already have this annotation loaded, then record a pending
        // deletion. We do not check the group of the annotation here because a)
        // that information is not included with deletion notifications and b)
        // even if the annotation is from the current group, it might be for a
        // new annotation (saved in pendingUpdates and removed above), that has
        // not yet been loaded.
        if (annotationUI.annotationExists(ann.id)) {
          pendingDeletions[ann.id] = true;
        }
      });
      break;
    }

    if (!features.flagEnabled('defer_realtime_updates') ||
        !annotationUI.isSidebar()) {
      applyPendingUpdates();
    }
  }

  function handleSessionChangeNotification(message) {
    session.update(message.model);
  }

  function handleSocketOnError (event) {
    console.warn('Error connecting to H push notification service:', event);

    // In development, warn if the connection failure might be due to
    // the app's origin not having been whitelisted in the H service's config.
    //
    // Unfortunately the error event does not provide a way to get at the
    // HTTP status code for HTTP -> WS upgrade requests.
    var websocketHost = new URL(settings.websocketUrl).hostname;
    if (['localhost', '127.0.0.1'].indexOf(websocketHost) !== -1) {
      console.warn('Check that your H service is configured to allow ' +
                   'WebSocket connections from ' + window.location.origin);
    }
  }

  function handleSocketOnMessage (event) {
    // Wrap message dispatches in $rootScope.$apply() so that
    // scope watches on app state affected by the received message
    // are updated
    $rootScope.$apply(function () {
      var message = JSON.parse(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'annotation-notification') {
        handleAnnotationNotification(message);
      } else if (message.type === 'session-change') {
        handleSessionChangeNotification(message);
      } else {
        console.warn('received unsupported notification', message.type);
      }
    });
  }

  function sendClientConfig () {
    Object.keys(configMessages).forEach(function (key) {
      if (configMessages[key]) {
        socket.send(configMessages[key]);
      }
    });
  }

  /**
   * Send a configuration message to the push notification service.
   * Each message is associated with a key, which is used to re-send
   * configuration data to the server in the event of a reconnection.
   */
  function setConfig(key, configMessage) {
    configMessages[key] = configMessage;
    if (socket && socket.isConnected()) {
      socket.send(configMessage);
    }
  }

  var _connect = function () {
    var url = settings.websocketUrl;

    // If we have no URL configured, don't do anything.
    if (!url) {
      return;
    }

    socket = new Socket(url);

    socket.on('open', sendClientConfig);
    socket.on('error', handleSocketOnError);
    socket.on('message', handleSocketOnMessage);

    // Configure the client ID
    setConfig('client-id', {
      messageType: 'client_id',
      value: clientId,
    });
  };

  var connect = function () {
    if (socket) {
      return;
    }

    _connect();
  };

  var reconnect = function () {
    if (socket) {
      socket.close();
    }

    _connect();
  };

  function applyPendingUpdates() {
    var updates = Object.values(pendingUpdates);
    var deletions = Object.keys(pendingDeletions).map(function (id) {
      return {id: id};
    });

    if (updates.length) {
      annotationMapper.loadAnnotations(updates);
    }
    if (deletions.length) {
      annotationMapper.unloadAnnotations(deletions);
    }

    pendingUpdates = {};
    pendingDeletions = {};
  }

  function countPendingUpdates() {
    return Object.keys(pendingUpdates).length +
           Object.keys(pendingDeletions).length;
  }

  function hasPendingDeletion(id) {
    return pendingDeletions.hasOwnProperty(id);
  }

  function removePendingUpdates(event, anns) {
    if (!Array.isArray(anns)) {
      anns = [anns];
    }
    anns.forEach(function (ann) {
      delete pendingUpdates[ann.id];
      delete pendingDeletions[ann.id];
    });
  }

  function clearPendingUpdates() {
    pendingUpdates = {};
    pendingDeletions = {};
  }

  var updateEvents = [
    events.ANNOTATION_DELETED,
    events.ANNOTATION_UPDATED,
    events.ANNOTATIONS_UNLOADED,
  ];

  updateEvents.forEach(function (event) {
    $rootScope.$on(event, removePendingUpdates);
  });
  $rootScope.$on(events.GROUP_FOCUSED, clearPendingUpdates);

  this.applyPendingUpdates = applyPendingUpdates;
  this.countPendingUpdates = countPendingUpdates;
  this.hasPendingDeletion = hasPendingDeletion;
  this.clientId = clientId;
  this.configMessages = configMessages;
  this.connect = connect;
  this.reconnect = reconnect;
  this.setConfig = setConfig;
}

module.exports = Streamer;
