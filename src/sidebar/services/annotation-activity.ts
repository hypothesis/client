import type { Annotation } from '../../types/api';
import type { AnnotationEventType, SidebarSettings } from '../../types/config';
import { isShared } from '../helpers/permissions';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * Send messages to configured ancestor frame on annotation activity
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
      postMessageJsonRpc.notify(
        this._rpc.targetFrame,
        this._rpc.origin,
        this._reportConfig.method,
        [eventType, data],
      );
    }
  }
}
