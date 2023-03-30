import { ListenerCollection } from '../shared/listener-collection';
import type { PortRPC } from '../shared/messaging';
import type { Anchor, Destroyable } from '../types/annotator';
import type {
  HostToGuestEvent,
  GuestToHostEvent,
} from '../types/port-rpc-events';
import { computeAnchorPositions } from './util/buckets';

type HostRPC = PortRPC<HostToGuestEvent, GuestToHostEvent>;

export type BucketBarClientOptions = {
  /**
   * The scrollable container element for the document content. All the highlights
   * that the bucket bar's buckets point at should be contained within this element.
   */
  contentContainer: Element;

  hostRPC: HostRPC;
};

/**
 * Communicate to the host frame when:
 *
 * 1. The set of anchors has been changed (due to annotations being added or removed)
 * 2. The position of anchors relative to the viewport of the guest has changed
 */
export class BucketBarClient implements Destroyable {
  private _hostRPC: HostRPC;
  private _updatePending: boolean;
  private _anchors: Anchor[];
  private _listeners: ListenerCollection;

  constructor({ contentContainer, hostRPC }: BucketBarClientOptions) {
    this._hostRPC = hostRPC;
    this._updatePending = false;
    this._anchors = [];
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
   *
   * @param anchors - pass this option when anchors are added or deleted
   */
  update(anchors?: Anchor[]) {
    if (anchors) {
      this._anchors = anchors;
    }

    if (this._updatePending) {
      return;
    }

    this._updatePending = true;
    requestAnimationFrame(() => {
      const positions = computeAnchorPositions(this._anchors);
      this._hostRPC.call('anchorsChanged', positions);
      this._updatePending = false;
    });
  }
}
