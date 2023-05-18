import { generateHexString } from '../../shared/random';
import { warnOnce } from '../../shared/warn-once';
import type { SidebarStore } from '../store';
import { watch } from '../util/watch';
import { Socket } from '../websocket';
import type { APIRoutesService } from './api-routes';
import type { AuthService } from './auth';
import type { GroupsService } from './groups';
import type { SessionService } from './session';

/**
 * `StreamerService` manages the WebSocket connection to the Hypothesis Real-Time
 * API [1]
 *
 * This service is responsible for opening the WebSocket connection and sending
 * messages to configure what notifications are delivered to the client.
 * Other services call `setConfig` to specify the filtering configuration.
 *
 * When notifications are received via the WebSocket, this service adds them to
 * the store. Depending on the update they may be applied immediately or added
 * to the "pending real time updates" state so that they can be applied by the
 * user at a convenient time.
 *
 * [1] https://h.readthedocs.io/en/latest/api/realtime/
 *
 * @inject
 */
export class StreamerService {
  private _auth: AuthService;
  private _groups: GroupsService;
  private _session: SessionService;
  private _store: SidebarStore;
  private _websocketURL: Promise<string>;
  private _socket: Socket | null;
  private _reconnectSetUp: boolean;

  /**
   * Flag that controls whether to apply updates immediately or defer them
   * until "manually" applied via `applyPendingUpdates`
   */
  private _updateImmediately: boolean;

  /**
   * Client configuration messages, to be sent each time a new connection is
   * established.
   */
  private _configMessages: Record<string, object>;

  /**
   * Number of automatic reconnection attempts that have been made following
   * an unexpected disconnection.
   */
  private _reconnectionAttempts: number;

  /** The randomly generated session ID */
  clientId: string;

  constructor(
    store: SidebarStore,
    apiRoutes: APIRoutesService,
    auth: AuthService,
    groups: GroupsService,
    session: SessionService
  ) {
    this._auth = auth;
    this._groups = groups;
    this._session = session;
    this._store = store;
    this._websocketURL = apiRoutes.links().then(links => links.websocket);

    this.clientId = generateHexString(32);

    this._socket = null;
    this._updateImmediately = true;
    this._configMessages = {};
    this._reconnectionAttempts = 0;
    this._reconnectSetUp = false;
  }

  /**
   * Apply updates to annotations which have been received but not yet
   * applied.
   */
  applyPendingUpdates() {
    const updates = Object.values(this._store.pendingUpdates());
    if (updates.length) {
      this._store.addAnnotations(updates);
    }

    const deletions = Object.keys(this._store.pendingDeletions()).map(id => ({
      id,
    }));
    if (deletions.length) {
      this._store.removeAnnotations(deletions);
    }

    this._store.clearPendingUpdates();
  }

  private _handleSocketError(websocketURL: string, event: ErrorEvent) {
    warnOnce('Error connecting to H push notification service:', event);

    // In development, warn if the connection failure might be due to
    // the app's origin not having been whitelisted in the H service's config.
    //
    // Unfortunately the error event does not provide a way to get at the
    // HTTP status code for HTTP -> WS upgrade requests.
    const websocketHost = new URL(websocketURL).hostname;
    if (['localhost', '127.0.0.1'].indexOf(websocketHost) !== -1) {
      /* istanbul ignore next */
      warnOnce(
        'Check that your H service is configured to allow ' +
          'WebSocket connections from ' +
          window.location.origin
      );
    }
  }

  private _handleSocketMessage(event: MessageEvent) {
    const message = JSON.parse(event.data);
    if (!message) {
      return;
    }

    if (message.type === 'annotation-notification') {
      const annotations = message.payload;
      switch (message.options.action) {
        case 'create':
        case 'update':
        case 'past':
          this._store.receiveRealTimeUpdates({
            updatedAnnotations: annotations,
          });
          break;
        case 'delete':
          this._store.receiveRealTimeUpdates({
            deletedAnnotations: annotations,
          });
          break;
      }

      if (this._updateImmediately) {
        this.applyPendingUpdates();
      }
    } else if (message.type === 'session-change') {
      this._session.update(message.model);
      this._groups.load();
    } else if (message.type === 'whoyouare') {
      const userid = this._store.profile().userid;
      if (message.userid !== userid) {
        console.warn(
          'WebSocket user ID "%s" does not match logged-in ID "%s"',
          message.userid,
          userid
        );
      }
    } else {
      warnOnce('Received unsupported notification', message.type);
    }
  }

  private _sendClientConfig(socket: Socket) {
    Object.keys(this._configMessages).forEach(key => {
      if (this._configMessages[key]) {
        socket.send(this._configMessages[key]);
      }
    });
  }

  /**
   * Send a configuration message to the push notification service.
   * Each message is associated with a key, which is used to re-send
   * configuration data to the server in the event of a reconnection.
   */
  setConfig(key: string, configMessage: object) {
    this._configMessages[key] = configMessage;
    if (this._socket?.isConnected()) {
      this._socket.send(configMessage);
    }
  }

  async _reconnect() {
    const websocketURL = await this._websocketURL;
    if (!websocketURL) {
      return;
    }
    this._socket?.close();

    let token;
    try {
      token = await this._auth.getAccessToken();
    } catch (err) {
      console.error('Failed to fetch token for WebSocket authentication', err);
      throw err;
    }

    let url;
    if (token) {
      // Include the access token in the URL via a query param. This method
      // is used to send credentials because the `WebSocket` constructor does
      // not support setting the `Authorization` header directly as we do for
      // other API requests.
      const parsedURL = new URL(websocketURL);
      parsedURL.searchParams.set('access_token', token);
      url = parsedURL.toString();
    } else {
      url = websocketURL;
    }

    const newSocket = new Socket(url);
    newSocket.on('open', () => {
      this._reconnectionAttempts = 0;
      this._sendClientConfig(newSocket);
    });
    newSocket.on('disconnect', () => {
      ++this._reconnectionAttempts;
      if (this._reconnectionAttempts < 10) {
        // Reconnect with a delay that doubles on each attempt.
        // This reduces the stampede of requests if the WebSocket server has a
        // problem.
        const delay = 1000 * 2 ** this._reconnectionAttempts;
        setTimeout(() => this._reconnect(), delay);
      } else {
        console.error(
          'Gave up trying to reconnect to Hypothesis real time update service'
        );
      }
    });
    newSocket.on('error', (event: ErrorEvent) =>
      this._handleSocketError(websocketURL, event)
    );
    newSocket.on('message', (event: MessageEvent) =>
      this._handleSocketMessage(event)
    );
    this._socket = newSocket;

    // Configure the client ID
    this.setConfig('client-id', {
      messageType: 'client_id',
      value: this.clientId,
    });

    // Send a "whoami" message. The server will respond with a "whoyouare"
    // reply which is useful for verifying that authentication worked as
    // expected.
    this.setConfig('auth-check', {
      type: 'whoami',
      id: 1,
    });
  }

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this does nothing.
   *
   * @param [options.applyUpdatesImmediately] - true if pending updates should be applied immediately
   * @return Promise which resolves once the WebSocket connection process has started.
   */
  async connect(
    options: { applyUpdatesImmediately?: boolean } = {}
  ): Promise<void> {
    this._updateImmediately = options.applyUpdatesImmediately ?? true;

    // Setup reconnection when user changes, as auth token will have changed.
    if (!this._reconnectSetUp) {
      this._reconnectSetUp = true;
      watch(
        this._store.subscribe,
        () => this._store.profile().userid,
        () => this._reconnect()
      );
    }

    if (this._socket) {
      return;
    }
    await this._reconnect();
  }
}
