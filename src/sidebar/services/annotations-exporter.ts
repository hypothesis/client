import type { Annotation } from '../../types/api';
import { VersionData } from '../helpers/version-data';
import type { SidebarStore } from '../store';

export type ExportContent = {
  export_date: string;
  export_userid: string;
  client_version: string;
  annotations: Annotation[];
};

/**
 * Generates annotations exports
 *
 * @inject
 */
export class AnnotationsExporter {
  private _store: SidebarStore;

  constructor(store: SidebarStore) {
    this._store = store;
  }

  /**
   * @param now - Test seam
   */
  buildExportContent(now = new Date()): ExportContent {
    const profile = this._store.profile();
    const annotations = this._store.allAnnotations();
    const versionData = new VersionData(profile, []);

    return {
      export_date: now.toISOString(),
      export_userid: profile.userid ?? '',
      client_version: versionData.version,
      annotations,
    };
  }
}
