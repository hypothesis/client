'use strict';

const queryString = require('query-string');
const uuid = require('node-uuid');

const warnOnce = require('../../shared/warn-once');

const Socket = require('../websocket');

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
function Streamer(
  $rootScope,
  annotationMapper,
  store,
  auth,
  groups,
  session,
  settings
) {
  // The randomly generated session UUID
  const clientId = uuid.v4();

  // The socket instance for this Streamer instance
  let socket;

  // Client configuration messages, to be sent each time a new connection is
  // established.
  const configMessages = {};

  function handleAnnotationNotification(message) {
    const action = message.options.action;
    const annotations = message.payload;

    switch (action) {
      case 'create':
      case 'update':
      case 'past':
        store.receiveRealTimeUpdates({ updatedAnnotations: annotations });
        break;
      case 'delete':
        store.receiveRealTimeUpdates({ deletedAnnotations: annotations });
        break;
    }

    if (!store.isSidebar()) {
      applyPendingUpdates();
    }
  }

  function handleSessionChangeNotification(message) {
    session.update(message.model);
    groups.load();
  }

  function handleSocketOnError(event) {
    warnOnce('Error connecting to H push notification service:', event);

    // In development, warn if the connection failure might be due to
    // the app's origin not having been whitelisted in the H service's config.
    //
    // Unfortunately the error event does not provide a way to get at the
    // HTTP status code for HTTP -> WS upgrade requests.
    const websocketHost = new URL(settings.websocketUrl).hostname;
    if (['localhost', '127.0.0.1'].indexOf(websocketHost) !== -1) {
      warnOnce(
        'Check that your H service is configured to allow ' +
          'WebSocket connections from ' +
          window.location.origin
      );
    }
  }

  function handleSocketOnMessage(event) {
    // Wrap message dispatches in $rootScope.$apply() so that
    // scope watches on app state affected by the received message
    // are updated
    $rootScope.$apply(function() {
      const message = JSON.parse(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'annotation-notification') {
        handleAnnotationNotification(message);
      } else if (message.type === 'session-change') {
        handleSessionChangeNotification(message);
      } else if (message.type === 'whoyouare') {
        const userid = store.getState().session.userid;
        if (message.userid !== userid) {
          console.warn(
            'WebSocket user ID "%s" does not match logged-in ID "%s"',
            message.userid,
            userid
          );
        }
      } else {
        warnOnce('received unsupported notification', message.type);
      }
    });
  }

  function sendClientConfig() {
    Object.keys(configMessages).forEach(function(key) {
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

  const _connect = function() {
    // If we have no URL configured, don't do anything.
    if (!settings.websocketUrl) {
      return Promise.resolve();
    }

    return auth
      .tokenGetter()
      .then(function(token) {
        let url;
        if (token) {
          // Include the access token in the URL via a query param. This method
          // is used to send credentials because the `WebSocket` constructor does
          // not support setting the `Authorization` header directly as we do for
          // other API requests.
          const parsedURL = new URL(settings.websocketUrl);
          const queryParams = queryString.parse(parsedURL.search);
          queryParams.access_token = token;
          parsedURL.search = queryString.stringify(queryParams);
          url = parsedURL.toString();
        } else {
          url = settings.websocketUrl;
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

        // Send a "whoami" message. The server will respond with a "whoyouare"
        // reply which is useful for verifying that authentication worked as
        // expected.
        setConfig('auth-check', {
          type: 'whoami',
          id: 1,
        });
      })
      .catch(function(err) {
        console.error(
          'Failed to fetch token for WebSocket authentication',
          err
        );
      });
  };

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this does nothing.
   *
   * @return {Promise} Promise which resolves once the WebSocket connection
   *                   process has started.
   */
  function connect() {
    if (socket) {
      return Promise.resolve();
    }

    return _connect();
  }

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this closes the existing connection
   * and reconnects.
   *
   * @return {Promise} Promise which resolves once the WebSocket connection
   *                   process has started.
   */
  function reconnect() {
    if (socket) {
      socket.close();
    }

    return _connect();
  }

  function applyPendingUpdates() {
    const updates = Object.values(store.pendingUpdates());
    if (updates.length) {
      annotationMapper.loadAnnotations(updates);
    }

    const deletions = Object.keys(store.pendingDeletions()).map(id => ({ id }));
    if (deletions.length) {
      annotationMapper.unloadAnnotations(deletions);
    }

    store.clearPendingUpdates();
  }

  this.applyPendingUpdates = applyPendingUpdates;
  this.clientId = clientId;
  this.configMessages = configMessages;
  this.connect = connect;
  this.reconnect = reconnect;
  this.setConfig = setConfig;
}

module.exports = Streamer;
