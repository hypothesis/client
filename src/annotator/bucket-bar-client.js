import { ListenerCollection } from '../shared/listener-collection';

/**
 * @typedef {import('../shared/messaging').PortRPC<HostToGuestEvent, GuestToHostEvent>} HostRPC
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('../types/port-rpc-events').HostToGuestEvent} HostToGuestEvent
 * @typedef {import('../types/port-rpc-events').GuestToHostEvent} GuestToHostEvent
 */

/**
 * Communicate to the host frame when:
 *
 * 1. The set of anchors has been changed (due to annotations being added or removed)
 * 2. The position of anchors relative to the viewport of the guest has changed
 *
 * @implements {Destroyable}
 */
export class BucketBarClient {
  /**
   * @param {object} options
   *   @param {Element} options.contentContainer - The scrollable container element for the
   *     document content. All of the highlights that the bucket bar's buckets point
   *     at should be contained within this element.
   *   @param {HostRPC} options.hostRPC
   */
  constructor({ contentContainer, hostRPC }) {
    this._hostRPC = hostRPC;
    this._updatePending = false;
    this._listeners = new ListenerCollection();

    this._listeners.add(window, 'resize', () => this.update());
    this._listeners.add(window, 'scroll', () => this.update());
    this._listeners.add(contentContainer, 'scroll', () => this.update());
  }

  destroy() {
    this._listeners.removeAll();
  }

  /**
   * Notifies the BucketBar in the host frame when:
   * 1. The set of anchors has been changed (due to annotations being added or removed)
   * 2. The position of anchors relative to the viewport of the guest has changed
   *
   * Updates are debounced to reduce the overhead of gathering and sending anchor
   * position data across frames.
   */
  update() {
    if (this._updatePending) {
      return;
    }

    this._updatePending = true;
    requestAnimationFrame(() => {
      this._hostRPC.call('anchorsChanged');
      this._updatePending = false;
    });
  }
}
