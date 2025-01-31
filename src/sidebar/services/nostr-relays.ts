import { Relay } from 'nostr-tools';

/**
 * @inject
 */
export class NostrRelaysService {
  private _readRelays: Relay[];
  private _writeRelays: Relay[];

  constructor() {
    this._readRelays = [
      new Relay('ws://localhost:10547'),
      new Relay('wss://purplepag.es/'),
      new Relay('wss://relay.nostr.band/all'),
    ];
    
    this._writeRelays = process.env.NODE_ENV !== 'production' 
      ? [new Relay('ws://localhost:10547')]
      : [];
  }

  /**
   * Get the read relays that the user has configured. When we need to fetch
   * data from the nostr network, we use these relays.
   */
  getReadRelays() {
    return this._readRelays;
  }

  /**
   * Get the write relays that the user has configured. When we need to send
   * data to the nostr network, we use these relays. Also if we want to fetch
   * user specific events, we can use there relays.
   *
   * In development mode, we also include the read relays to make it easier to
   * test the nostr network.
   */
  getWriteRelays() {
    return this._writeRelays;
  }
}
