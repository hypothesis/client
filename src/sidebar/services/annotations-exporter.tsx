import {
  documentMetadata,
  renderMathAndMarkdown,
} from '@hypothesis/annotation-ui';
import renderToString from 'preact-render-to-string/jsx';

import type { CSVSeparator } from '../../shared/csv';
import { escapeCSVValue } from '../../shared/csv';
import { trimAndDedent } from '../../shared/trim-and-dedent';
import type { APIAnnotationData, Profile } from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import {
  annotationRole,
  isReply,
  pageLabel,
  description,
  quote,
} from '../helpers/annotation-metadata';
import { annotationDisplayName } from '../helpers/annotation-user';
import { stripInternalProperties } from '../helpers/strip-internal-properties';
import { VersionData } from '../helpers/version-data';
import { formatSortableDateTime } from '../util/time';

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

type CommonExportOptions = {
  defaultAuthority?: string;
  displayNamesEnabled?: boolean;
  groupName?: string;
};

export type TextExportOptions = CommonExportOptions & {
  now?: Date;
};

export type CSVExportOptions = CommonExportOptions & {
  separator?: CSVSeparator;
};

export type HTMLExportOptions = TextExportOptions;

/**
 * Generates annotations exports
 *
 * @inject
 */
export class AnnotationsExporter {
  private _settings: SidebarSettings;

  constructor(settings: SidebarSettings) {
    this._settings = settings;
  }

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
    }: TextExportOptions = {},
  ): string {
    const { uri, title, uniqueUsers, replies, extractUsername } =
      this._exportCommon(annotations, {
        displayNamesEnabled,
        defaultAuthority,
      });

    const annotationsAsText = annotations.map((annotation, index) => {
      const page = pageLabel(annotation);
      const annotationQuote = quote(annotation);
      const annotationDescription = description(annotation);

      const lines = [
        `Created at: ${formatSortableDateTime(new Date(annotation.created))}`,
        `Author: ${extractUsername(annotation)}`,
        page ? `Page: ${page}` : undefined,
        `Type: ${annotationRole(annotation, this._settings)}`,
        annotationQuote ? `Quote: "${annotationQuote}"` : undefined,
        annotationDescription
          ? `Description: ${annotationDescription}`
          : undefined,
        `Comment: ${annotation.text}`,
        annotation.tags.length > 0
          ? `Tags: ${annotation.tags.join(', ')}`
          : undefined,
      ].filter(Boolean);

      return trimAndDedent`
        Annotation ${index + 1}:
        ${lines.join('\n')}`;
    });

    return trimAndDedent`
      ${formatSortableDateTime(now)}
      ${title}
      ${uri}
      Group: ${groupName}
      Total users: ${uniqueUsers.length}
      Users: ${uniqueUsers.join(', ')}
      Total annotations: ${annotations.length}
      Total replies: ${replies.length}
      
      ${annotationsAsText.join('\n\n')}`;
  }

  buildCSVExportContent(
    annotations: APIAnnotationData[],
    {
      groupName = '',
      defaultAuthority = '',
      displayNamesEnabled = false,
      separator = ',',
    }: CSVExportOptions = {},
  ): string {
    const { uri, extractUsername } = this._exportCommon(annotations, {
      displayNamesEnabled,
      defaultAuthority,
    });
    const annotationToRow = (annotation: APIAnnotationData) =>
      [
        formatSortableDateTime(new Date(annotation.created)),
        extractUsername(annotation),
        pageLabel(annotation) ?? '',
        uri,
        groupName,
        annotationRole(annotation, this._settings),
        quote(annotation) ?? description(annotation) ?? '',
        annotation.text,
        annotation.tags.join(','),
      ]
        .map(value => escapeCSVValue(value, separator))
        .join(separator);

    const headers = [
      'Created at',
      'Author',
      'Page',
      'URL',
      'Group',
      'Type',
      'Quote/description',
      'Comment',
      'Tags',
    ].join(separator);
    const annotationsContent = annotations
      .map(anno => annotationToRow(anno))
      .join('\n');

    return `${headers}\n${annotationsContent}`;
  }

  buildHTMLExportContent(
    annotations: APIAnnotationData[],
    {
      groupName = '',
      displayNamesEnabled = false,
      defaultAuthority = '',
      /* istanbul ignore next - test seam */
      now = new Date(),
    }: HTMLExportOptions = {},
  ): string {
    const { uri, title, uniqueUsers, replies, extractUsername } =
      this._exportCommon(annotations, {
        displayNamesEnabled,
        defaultAuthority,
      });

    return renderToString(
      <html lang="en">
        <head>
          <title>{`Annotations on "${title}"`}</title>
          <meta charSet="UTF-8" />
        </head>
        <body>
          <section>
            <h1>Summary</h1>
            <p>
              <time dateTime={now.toISOString()}>
                {formatSortableDateTime(now)}
              </time>
            </p>
            <p>
              <strong>{title}</strong>
            </p>
            <p>
              <a href={uri} target="_blank" rel="noopener noreferrer">
                {uri}
              </a>
            </p>

            <table>
              <tbody style={{ verticalAlign: 'top' }}>
                <tr>
                  <td>Group:</td>
                  <td>{groupName}</td>
                </tr>
                <tr>
                  <td>Total users:</td>
                  <td>{uniqueUsers.length}</td>
                </tr>
                <tr>
                  <td>Users:</td>
                  <td>{uniqueUsers.join(', ')}</td>
                </tr>
                <tr>
                  <td>Total annotations:</td>
                  <td>{annotations.length}</td>
                </tr>
                <tr>
                  <td>Total replies:</td>
                  <td>{replies.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <hr />
          <section>
            <h1>Annotations</h1>
            {annotations.map((annotation, index) => {
              const page = pageLabel(annotation);
              const annotationQuote = quote(annotation);
              const annotationDescription = description(annotation);
              const renderedComment = renderMathAndMarkdown(annotation.text);

              // When the result of rendering the text's markdown is just a
              // single paragraph, we fall back to the annotation text, to
              // avoid extra margins added by some editors, like Google Docs
              const comment =
                renderedComment === `<p>${annotation.text}</p>`
                  ? annotation.text
                  : renderedComment;

              return (
                <article key={annotation.id}>
                  <h2>Annotation {index + 1}:</h2>
                  <table>
                    <tbody style={{ verticalAlign: 'top' }}>
                      <tr>
                        <td>Created at:</td>
                        <td>
                          <time dateTime={annotation.created}>
                            {formatSortableDateTime(
                              new Date(annotation.created),
                            )}
                          </time>
                        </td>
                      </tr>
                      <tr>
                        <td>Author:</td>
                        <td>{extractUsername(annotation)}</td>
                      </tr>
                      {page && (
                        <tr>
                          <td>Page:</td>
                          <td>{page}</td>
                        </tr>
                      )}
                      <tr>
                        <td>Type:</td>
                        <td>{annotationRole(annotation, this._settings)}</td>
                      </tr>
                      {annotationQuote && (
                        <tr>
                          <td>Quote:</td>
                          <td>
                            <blockquote style={{ margin: 0 }}>
                              {annotationQuote}
                            </blockquote>
                          </td>
                        </tr>
                      )}
                      {annotationDescription && (
                        <tr>
                          <td>Description:</td>
                          <td>{annotationDescription}</td>
                        </tr>
                      )}
                      <tr>
                        <td>Comment:</td>
                        <td
                          dangerouslySetInnerHTML={{
                            __html: comment,
                          }}
                        />
                      </tr>
                      {annotation.tags.length > 0 && (
                        <tr>
                          <td>Tags:</td>
                          <td>{annotation.tags.join(', ')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </article>
              );
            })}
          </section>
        </body>
      </html>,
      {},
      { pretty: true },
      // `renderToString` indents lines with tabs when using `pretty: true`.
      // Replacing them with double spaces we avoid side effects when pasting
      // the result in a web app.
    ).replace(/\t/g, '  ');
  }

  private _exportCommon(
    annotations: APIAnnotationData[],
    {
      displayNamesEnabled,
      defaultAuthority,
    }: Required<Omit<CommonExportOptions, 'groupName'>>,
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
