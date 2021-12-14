import { ListenerCollection } from '../shared/listener-collection';

/**
 * @typedef {import('../shared/bridge').Bridge<GuestToHostEvent, HostToGuestEvent>} HostBridge
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('../types/bridge-events').HostToGuestEvent} HostToGuestEvent
 * @typedef {import('../types/bridge-events').GuestToHostEvent} GuestToHostEvent
 * @typedef {import('./util/buckets-alt').BucketSet} BucketSet
 */

/**
 * @implements {Destroyable}
 */
export class BucketService {
  /**
   * @param {HostBridge} hostRPC
   * @param {object} options
   *   @param {()=> BucketSet} options.onUpdateBuckets
   */
  constructor(hostRPC, { onUpdateBuckets }) {
    this._hostRPC = hostRPC;
    this._onUpdateBuckets = onUpdateBuckets;
    this._updatePending = false;
    this._listeners = new ListenerCollection();

    this._listeners.add(window, 'scroll', () => this._update());
    this._listeners.add(window, 'resize', () => this._update());
  }

  _update() {
    if (this._updatePending) {
      return;
    }
    this._updatePending = true;
    requestAnimationFrame(() => {
      this.notify(this._onUpdateBuckets());
      this._updatePending = false;
    });
  }

  /**
   *
   * @param {BucketSet} buckets
   * @param {object} [option]
   *   @param {boolean} option.notify
   */
  notify(buckets, { notify } = { notify: true }) {
    if (notify) {
      this._hostRPC.call('bucketsUpdated', buckets);
    }
  }

  destroy() {
    this._listeners.removeAll();
  }
}
