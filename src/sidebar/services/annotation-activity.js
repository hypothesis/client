import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../../types/config').AnnotationEventType} AnnotationEventType
 */

/**
 * Send messages to configured ancestor frame on annotation activity
 */
// @inject
export class AnnotationActivityService {
  /**
   * @param {SidebarSettings} settings
   */
  constructor(settings) {
    this._rpc = settings.rpc;
    this._reportConfig = settings.reportActivity;
  }

  /**
   * @param {AnnotationEventType} eventType
   * @param {Annotation} annotation
   */
  reportActivity(eventType, annotation) {
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
      },
    };

    if (this._reportConfig.events.includes(eventType)) {
      postMessageJsonRpc.call(
        this._rpc.targetFrame,
        this._rpc.origin,
        this._reportConfig.method,
        [eventType, data],
        3000
      );
    }
  }
}
