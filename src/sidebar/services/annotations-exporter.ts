import type { APIAnnotationData } from '../../types/api';
import { stripInternalProperties } from '../helpers/strip-internal-properties';
import { VersionData } from '../helpers/version-data';
import type { SidebarStore } from '../store';

export type ExportContent = {
  export_date: string;
  export_userid: string;
  client_version: string;
  annotations: APIAnnotationData[];
};

export type ExportContentResult = {
  content: ExportContent;

  /**
   * The amount of annotations known by the client, that were not included in
   * the export content because they are considered "drafts"
   */
  excludedAnnotations: number;
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
  buildExportContent(now = new Date()): ExportContentResult {
    const profile = this._store.profile();
    const { annotations, excludedAnnotations } =
      this._resolveAnnotationsToExport();
    const versionData = new VersionData(profile, []);

    return {
      content: {
        export_date: now.toISOString(),
        export_userid: profile.userid ?? '',
        client_version: versionData.version,
        annotations,
      },
      excludedAnnotations,
    };
  }

  private _resolveAnnotationsToExport(): {
    annotations: APIAnnotationData[];
    excludedAnnotations: number;
  } {
    const allAnnotations = this._store.allAnnotations();
    const filteredAnnotations = allAnnotations.filter(
      annotation => !!annotation.id
    );

    return {
      annotations: filteredAnnotations.map(
        stripInternalProperties
      ) as APIAnnotationData[],
      excludedAnnotations: allAnnotations.length - filteredAnnotations.length,
    };
  }
}
