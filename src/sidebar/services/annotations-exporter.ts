import { trimAndDedent } from '../../shared/trim-and-dedent';
import type { APIAnnotationData } from '../../types/api';
import { username } from '../helpers/account-id';
import {
  documentMetadata,
  isReply,
  quote,
} from '../helpers/annotation-metadata';
import { stripInternalProperties } from '../helpers/strip-internal-properties';
import { VersionData } from '../helpers/version-data';
import type { SidebarStore } from '../store';

export type JSONExportContent = {
  export_date: string;
  export_userid: string;
  client_version: string;
  annotations: APIAnnotationData[];
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

  buildJSONExportContent(
    annotations: APIAnnotationData[],
    /* istanbul ignore next - test seam */
    now = new Date(),
  ): JSONExportContent {
    const profile = this._store.profile();
    const versionData = new VersionData(profile, []);

    return {
      export_date: now.toISOString(),
      export_userid: profile.userid ?? '',
      client_version: versionData.version,
      annotations: annotations.map(
        stripInternalProperties,
      ) as APIAnnotationData[],
    };
  }

  buildTextExportContent(
    annotations: APIAnnotationData[],
    groupName = '',
    /* istanbul ignore next - test seam */
    now = new Date(),
  ): string {
    const [firstAnnotation] = annotations;
    if (!firstAnnotation) {
      throw new Error('No annotations to export');
    }

    const { uri, title } = documentMetadata(firstAnnotation);
    const uniqueUsers = [
      ...new Set(
        annotations
          .map(annotation => username(annotation.user))
          .filter(Boolean),
      ),
    ];

    const annotationsText = annotations
      .map(
        (annotation, index) =>
          trimAndDedent`
          Annotation ${index + 1}:
          ${annotation.created}
          ${annotation.text}
          ${username(annotation.user)}
          "${quote(annotation)}"
          Tags: ${annotation.tags.join(', ')}`,
      )
      .join('\n\n');

    return trimAndDedent`
      ${now.toISOString()}
      ${title}
      ${uri}
      Group: ${groupName}
      Total users: ${uniqueUsers.length}
      Users: ${uniqueUsers.join(', ')}
      Total annotations: ${annotations.length}
      Total replies: ${annotations.filter(isReply).length}
      
      ${annotationsText}`;
  }
}
