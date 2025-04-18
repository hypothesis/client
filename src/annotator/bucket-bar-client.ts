import { ListenerCollection } from '@hypothesis/frontend-shared';

import type { PortRPC } from '../shared/messaging';
import type { Anchor, Destroyable } from '../types/annotator';
import type {
  HostToGuestCalls,
  GuestToHostCalls,
} from '../types/port-rpc-calls';
import { computeAnchorPositions } from './util/buckets';

type HostRPC = PortRPC<HostToGuestCalls, GuestToHostCalls>;

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

    // Update bucket positions when container or scrollable descendants are
    // scrolled.
    this._listeners.add(contentContainer, 'scroll', () => this.update(), {
      // "scroll" event does not bubble, so use a capture listener to observe
      // event in descendants.
      capture: true,
    });
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
