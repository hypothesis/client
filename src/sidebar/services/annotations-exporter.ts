import { trimAndDedent } from '../../shared/trim-and-dedent';
import type { APIAnnotationData, Profile } from '../../types/api';
import {
  documentMetadata,
  isReply,
  pageLabel,
  quote,
} from '../helpers/annotation-metadata';
import { annotationDisplayName } from '../helpers/annotation-user';
import { stripInternalProperties } from '../helpers/strip-internal-properties';
import { VersionData } from '../helpers/version-data';

export type JSONExportContent = {
  export_date: string;
  export_userid: string;
  client_version: string;
  annotations: APIAnnotationData[];
};

export type JSONExportOptions = {
  profile: Profile;
  now?: Date;
};

export type ExportOptions = {
  defaultAuthority?: string;
  displayNamesEnabled?: boolean;
  groupName?: string;
  now?: Date;
};

/**
 * Generates annotations exports
 *
 * @inject
 */
export class AnnotationsExporter {
  buildJSONExportContent(
    annotations: APIAnnotationData[],
    {
      profile,
      /* istanbul ignore next - test seam */
      now = new Date(),
    }: JSONExportOptions,
  ): JSONExportContent {
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
    {
      groupName = '',
      displayNamesEnabled = false,
      defaultAuthority = '',
      /* istanbul ignore next - test seam */
      now = new Date(),
    }: ExportOptions = {},
  ): string {
    const { uri, title, uniqueUsers, replies, extractUsername } =
      this._exportCommon(annotations, {
        displayNamesEnabled,
        defaultAuthority,
      });

    const annotationsText = annotations
      .map((annotation, index) => {
        const page = pageLabel(annotation);
        const lines = [
          annotation.created,
          `Comment: ${annotation.text}`,
          extractUsername(annotation),
          `Quote: "${quote(annotation)}"`,
          annotation.tags.length > 0
            ? `Tags: ${annotation.tags.join(', ')}`
            : undefined,
          page ? `Page: ${page}` : undefined,
        ].filter(Boolean);

        return trimAndDedent`
          Annotation ${index + 1}:
          ${lines.join('\n')}`;
      })
      .join('\n\n');

    return trimAndDedent`
      ${now.toISOString()}
      ${title}
      ${uri}
      Group: ${groupName}
      Total users: ${uniqueUsers.length}
      Users: ${uniqueUsers.join(', ')}
      Total annotations: ${annotations.length}
      Total replies: ${replies.length}
      
      ${annotationsText}`;
  }

  buildCSVExportContent(
    annotations: APIAnnotationData[],
    {
      groupName = '',
      defaultAuthority = '',
      displayNamesEnabled = false,
    }: Exclude<ExportOptions, 'now'> = {},
  ): string {
    const { uri, extractUsername } = this._exportCommon(annotations, {
      displayNamesEnabled,
      defaultAuthority,
    });

    const escapeCSVValue = (value: string): string => {
      // If the value contains a comma, newline or double quote, then wrap it in
      // double quotes and escape any existing double quotes.
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    const annotationToRow = (annotation: APIAnnotationData) =>
      [
        annotation.created,
        uri,
        groupName,
        isReply(annotation) ? 'Reply' : 'Annotation',
        quote(annotation) ?? '',
        extractUsername(annotation),
        annotation.text,
        annotation.tags.join(','),
        pageLabel(annotation) ?? '',
      ]
        .map(escapeCSVValue)
        .join(',');

    const headers = [
      'Creation Date',
      'URL',
      'Group',
      'Annotation/Reply Type',
      'Quote',
      'User',
      'Body',
      'Tags',
      'Page',
    ].join(',');
    const annotationsContent = annotations
      .map(anno => annotationToRow(anno))
      .join('\n');

    return `${headers}\n${annotationsContent}`;
  }

  private _exportCommon(
    annotations: APIAnnotationData[],
    {
      displayNamesEnabled,
      defaultAuthority,
    }: Required<
      Pick<ExportOptions, 'displayNamesEnabled' | 'defaultAuthority'>
    >,
  ) {
    const [firstAnnotation] = annotations;
    if (!firstAnnotation) {
      throw new Error('No annotations to export');
    }

    const extractUsername = (annotation: APIAnnotationData) =>
      annotationDisplayName(annotation, defaultAuthority, displayNamesEnabled);

    const { uri, title } = documentMetadata(firstAnnotation);
    const uniqueUsers = [
      ...new Set(
        annotations.map(anno => extractUsername(anno)).filter(Boolean),
      ),
    ];
    const replies = annotations.filter(anno => isReply(anno));

    return { uri, title, uniqueUsers, replies, extractUsername };
  }
}
