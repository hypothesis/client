import * as queryString from 'query-string';

import warnOnce from '../../shared/warn-once';
import { generateHexString } from '../util/random';
import Socket from '../websocket';
import { watch } from '../util/watch';

/**
 * Open a new WebSocket connection to the Hypothesis push notification service.
 * Only one websocket connection may exist at a time, any existing socket is
 * closed.
 *
 * @param {import('../store').SidebarStore} store
 * @param {import('./auth').AuthService} auth
 * @param {ReturnType<import('./groups').default>} groups
 * @param {import('./session').SessionService} session
 * @param {Record<string, any>} settings
 */
// @inject
export default function Streamer(store, auth, groups, session, settings) {
  // The randomly generated session ID
  const clientId = generateHexString(32);

  // The socket instance for this Streamer instance
  let socket;

  // Flag that controls when to apply pending updates
  let updateImmediately = true;

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

    if (updateImmediately) {
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
    const message = JSON.parse(event.data);
    if (!message) {
      return;
    }

    if (message.type === 'annotation-notification') {
      handleAnnotationNotification(message);
    } else if (message.type === 'session-change') {
      handleSessionChangeNotification(message);
    } else if (message.type === 'whoyouare') {
      const userid = store.profile().userid;
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
  }

  function sendClientConfig() {
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

  const _connect = function () {
    // If we have no URL configured, don't do anything.
    if (!settings.websocketUrl) {
      return Promise.resolve();
    }

    return auth
      .getAccessToken()
      .then(function (token) {
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
      .catch(function (err) {
        console.error(
          'Failed to fetch token for WebSocket authentication',
          err
        );
      });
  };

  let reconnectSetUp = false;
  /**
   * Set up automatic reconnecting when user changes.
   */
  function setUpAutoReconnect() {
    if (reconnectSetUp) {
      return;
    }
    reconnectSetUp = true;

    // Reconnect when user changes, as auth token will have changed
    watch(
      store.subscribe,
      () => store.profile().userid,
      () => {
        reconnect();
      }
    );
  }

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this does nothing.
   *
   * @param {Object} [options]
   * @param {boolean} [options.applyUpdatesImmediately] - true if pending updates should be applied immediately
   *
   * @return {Promise<void>} Promise which resolves once the WebSocket connection
   *    process has started.
   */
  function connect(options = {}) {
    updateImmediately = options.applyUpdatesImmediately ?? true;
    setUpAutoReconnect();
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
      store.addAnnotations(updates);
    }

    const deletions = Object.keys(store.pendingDeletions()).map(id => ({ id }));
    if (deletions.length) {
      store.removeAnnotations(deletions);
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
