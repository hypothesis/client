import type { Annotation } from '../../types/api';
import type { AnnotationEventType, SidebarSettings } from '../../types/config';
import { isShared } from '../helpers/permissions';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * Service for sending messages to the embedder frame.
 *
 * This is primarily used in the Hypothesis LMS app, where the client sends
 * the LMS frontend notifications about annotation activity happening in the
 * client.
 */
// @inject
export class AnnotationActivityService {
  private _rpc: SidebarSettings['rpc'];
  private _reportConfig: SidebarSettings['reportActivity'];

  constructor(settings: SidebarSettings) {
    this._rpc = settings.rpc;
    this._reportConfig = settings.reportActivity;
  }

  reportActivity(eventType: AnnotationEventType, annotation: Annotation) {
    if (!this._rpc || !this._reportConfig) {
      return;
    }

    // Determine the appropriate ISO-8601 timestamp for this "activity"
    let activityDate;
    switch (eventType) {
      case 'create':
        activityDate = new Date(annotation.created).toISOString();
        break;
      case 'update':
        activityDate = new Date(annotation.updated).toISOString();
        break;
      default:
        activityDate = new Date().toISOString();
    }

    const data = {
      date: activityDate,
      annotation: {
        id: annotation.id,
        isShared: isShared(annotation.permissions),
      },
    };

    if (this._reportConfig.events.includes(eventType)) {
      this.notify(this._reportConfig.method, [eventType, data]);
    }
  }

  /**
   * Notify the embedder frame that the client has, or does not have,
   * unsaved changes to annotations.
   */
  notifyUnsavedChanges(unsaved: boolean) {
    this.notify('reportUnsavedChanges', [{ unsaved }]);
  }

  /** Send a JSON-RPC message to the embedder frame. */
  private notify(method: string, args: unknown[]) {
    if (!this._rpc) {
      return;
    }
    postMessageJsonRpc.notify(
      this._rpc.targetFrame,
      this._rpc.origin,
      method,
      args,
    );
  }
}
