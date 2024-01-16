import {
  Button,
  CardActions,
  Link,
  Input,
  SelectNext,
  CopyIcon,
} from '@hypothesis/frontend-shared';
import { useCallback, useId, useMemo, useState } from 'preact/hooks';

import { downloadFile } from '../../../shared/download-file';
import type { APIAnnotationData } from '../../../types/api';
import { annotationDisplayName } from '../../helpers/annotation-user';
import type { UserAnnotations } from '../../helpers/annotations-by-user';
import { annotationsByUser } from '../../helpers/annotations-by-user';
import { suggestedFilename } from '../../helpers/export-annotations';
import { withServices } from '../../service-context';
import type { AnnotationsExporter } from '../../services/annotations-exporter';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { copyPlainText, copyHTML } from '../../util/copy-to-clipboard';
import LoadingSpinner from './LoadingSpinner';
import { UserAnnotationsListItem } from './UserAnnotationsListItem';

export type ExportAnnotationsProps = {
  // injected
  annotationsExporter: AnnotationsExporter;
  toastMessenger: ToastMessengerService;
};

type ExportFormat = {
  /** Unique format identifier used also as file extension */
  value: 'json' | 'csv' | 'txt' | 'html';
  /** The title to be displayed in the listbox item */
  title: string;

  /**
   * The title to be displayed in the Select button.
   * Falls back to `title` when not provided.
   */
  shortTitle?: string;

  description: string;
};

const exportFormats: ExportFormat[] = [
  {
    value: 'json',
    title: 'JSON',
    description: 'For import into another Hypothesis group or document',
  },
  {
    value: 'txt',
    title: 'Plain text (TXT)',
    shortTitle: 'Text',
    description: 'For import into word processors as plain text',
  },
  {
    value: 'csv',
    title: 'Table (CSV)',
    shortTitle: 'CSV',
    description: 'For import into a spreadsheet',
  },
  {
    value: 'html',
    title: 'Rich text (HTML)',
    shortTitle: 'HTML',
    description: 'For import into word processors as rich text',
  },
];

function formatToMimeType(format: ExportFormat['value']): string {
  const typeForFormat: Record<ExportFormat['value'], string> = {
    json: 'application/json',
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
  };
  return typeForFormat[format];
}

/**
 * Render content for "export" tab panel: allow user to export annotations
 * with a specified filename.
 */
function ExportAnnotations({
  annotationsExporter,
  toastMessenger,
}: ExportAnnotationsProps) {
  const store = useSidebarStore();
  const group = store.focusedGroup();
  const exportReady = group && !store.isLoading();
  const contentFrame = store.defaultContentFrame();

  const exportableAnnotations = store.savedAnnotations();
  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');
  const getDisplayName = useCallback(
    (ann: APIAnnotationData) =>
      annotationDisplayName(ann, defaultAuthority, displayNamesEnabled),
    [defaultAuthority, displayNamesEnabled],
  );
  const userList = useMemo(
    () =>
      annotationsByUser({ annotations: exportableAnnotations, getDisplayName }),
    [exportableAnnotations, getDisplayName],
  );

  // User whose annotations are going to be exported.
  const profile = store.profile();
  const currentUser = profile.userid;
  const allAnnotationsOption: Omit<UserAnnotations, 'userid'> = useMemo(
    () => ({
      annotations: exportableAnnotations,
      displayName: 'All annotations',
    }),
    [exportableAnnotations],
  );
  const [selectedUser, setSelectedUser] = useState(
    // Try to preselect current user
    userList.find(userInfo => userInfo.userid === currentUser) ??
      allAnnotationsOption,
  );

  const exportFormatsEnabled = store.isFeatureEnabled('export_formats');
  const [exportFormat, setExportFormat] = useState(exportFormats[0]);

  const fileInputId = useId();
  const userSelectId = useId();

  const draftCount = store.countDrafts();

  const defaultFilename = useMemo(
    () =>
      suggestedFilename({
        documentMetadata: contentFrame?.metadata,
        groupName: group?.name,
      }),
    [contentFrame, group],
  );
  const [customFilename, setCustomFilename] = useState<string>();

  const buildExportContent = useCallback(
    (format: ExportFormat['value']): string => {
      const annotationsToExport =
        selectedUser?.annotations ?? exportableAnnotations;
      switch (format) {
        case 'json': {
          const data = annotationsExporter.buildJSONExportContent(
            annotationsToExport,
            { profile },
          );
          return JSON.stringify(data, null, 2);
        }
        case 'txt': {
          return annotationsExporter.buildTextExportContent(
            annotationsToExport,
            {
              groupName: group?.name,
              defaultAuthority,
              displayNamesEnabled,
            },
          );
        }
        case 'csv': {
          return annotationsExporter.buildCSVExportContent(
            annotationsToExport,
            {
              groupName: group?.name,
              defaultAuthority,
              displayNamesEnabled,
            },
          );
        }
        case 'html': {
          return annotationsExporter.buildHTMLExportContent(
            annotationsToExport,
            {
              groupName: group?.name,
              defaultAuthority,
              displayNamesEnabled,
            },
          );
        }
        /* istanbul ignore next - This should never happen */
        default:
          throw new Error(`Invalid format: ${format}`);
      }
    },
    [
      annotationsExporter,
      defaultAuthority,
      displayNamesEnabled,
      exportableAnnotations,
      group?.name,
      profile,
      selectedUser?.annotations,
    ],
  );
  const exportAnnotations = useCallback(
    (e: Event) => {
      e.preventDefault();

      try {
        const format = exportFormat.value;
        const filename = `${customFilename ?? defaultFilename}.${format}`;
        const exportData = buildExportContent(format);
        const mimeType = formatToMimeType(format);

        downloadFile(exportData, mimeType, filename);
      } catch (e) {
        toastMessenger.error('Exporting annotations failed');
      }
    },
    [
      buildExportContent,
      customFilename,
      defaultFilename,
      exportFormat.value,
      toastMessenger,
    ],
  );
  const copyAnnotationsExport = useCallback(async () => {
    const format = exportFormat.value;
    const exportData = buildExportContent(format);

    try {
      if (format === 'html') {
        await copyHTML(exportData);
      } else {
        await copyPlainText(exportData);
      }

      toastMessenger.success('Annotations copied');
    } catch (e) {
      toastMessenger.error('Copying annotations failed');
    }
  }, [buildExportContent, exportFormat.value, toastMessenger]);

  if (!exportReady) {
    return <LoadingSpinner />;
  }

  // Naive simple English pluralization
  const pluralize = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  return (
    <form
      className="space-y-3"
      onSubmit={exportAnnotations}
      data-testid="export-form"
    >
      {exportableAnnotations.length > 0 ? (
        <>
          <p className="text-color-text-light">
            <Link
              variant="text-light"
              underline="always"
              href="https://web.hypothes.is/help/exporting-and-importing-annotations-in-the-hypothesis-web-app/"
              target="_blank"
            >
              Learn more
            </Link>{' '}
            about copying and exporting annotations.
          </p>
          <div className="flex flex-col gap-y-3">
            <label htmlFor={userSelectId} className="font-medium">
              Select which user{"'"}s annotations to export:
            </label>
            <SelectNext
              value={selectedUser}
              onChange={setSelectedUser}
              buttonId={userSelectId}
              buttonContent={
                <UserAnnotationsListItem userAnnotations={selectedUser} />
              }
              data-testid="user-select"
            >
              <SelectNext.Option value={allAnnotationsOption}>
                <UserAnnotationsListItem
                  userAnnotations={allAnnotationsOption}
                />
              </SelectNext.Option>
              {userList.map(userInfo => (
                <SelectNext.Option key={userInfo.userid} value={userInfo}>
                  <UserAnnotationsListItem userAnnotations={userInfo} />
                </SelectNext.Option>
              ))}
            </SelectNext>
            <label
              data-testid="export-count"
              htmlFor={fileInputId}
              className="font-medium"
            >
              Name of export file:
            </label>
            <div className="flex">
              <Input
                classes="grow"
                data-testid="export-filename"
                id={fileInputId}
                defaultValue={defaultFilename}
                value={customFilename}
                onChange={e =>
                  setCustomFilename((e.target as HTMLInputElement).value)
                }
                required
                maxLength={250}
              />
              {exportFormatsEnabled && (
                <div className="grow-0 ml-2 min-w-[5rem]">
                  <SelectNext
                    value={exportFormat}
                    onChange={setExportFormat}
                    buttonContent={
                      exportFormat.shortTitle ?? exportFormat.title
                    }
                    data-testid="export-format-select"
                    right
                  >
                    {exportFormats.map(exportFormat => (
                      <SelectNext.Option
                        key={exportFormat.value}
                        value={exportFormat}
                      >
                        <div className="flex-col gap-y-2">
                          <div className="font-bold" data-testid="format-name">
                            {exportFormat.title}
                          </div>
                          <div data-testid="format-description">
                            {exportFormat.description}
                          </div>
                        </div>
                      </SelectNext.Option>
                    ))}
                  </SelectNext>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p data-testid="no-annotations-message">
          There are no annotations available for export.
        </p>
      )}
      {draftCount > 0 && (
        <p data-testid="drafts-message">
          You have {draftCount} unsaved{' '}
          {pluralize(draftCount, 'draft', 'drafts')}
          {exportableAnnotations.length > 0 && <> that will not be included</>}.
        </p>
      )}
      <CardActions>
        {exportFormatsEnabled && (
          <Button
            data-testid="copy-button"
            icon={CopyIcon}
            onClick={copyAnnotationsExport}
            disabled={exportableAnnotations.length === 0}
          >
            Copy to clipboard
          </Button>
        )}
        <Button
          data-testid="export-button"
          variant="primary"
          disabled={exportableAnnotations.length === 0}
          type="submit"
        >
          Export
        </Button>
      </CardActions>
    </form>
  );
}

export default withServices(ExportAnnotations, [
  'annotationsExporter',
  'toastMessenger',
]);
