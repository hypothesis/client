import {
  Button,
  CardActions,
  Link,
  Input,
  SelectNext,
} from '@hypothesis/frontend-shared';
import { useCallback, useId, useMemo, useState } from 'preact/hooks';

import { downloadJSONFile } from '../../../shared/download-json-file';
import type { APIAnnotationData } from '../../../types/api';
import { annotationDisplayName } from '../../helpers/annotation-user';
import type { UserAnnotations } from '../../helpers/annotations-by-user';
import { annotationsByUser } from '../../helpers/annotations-by-user';
import { suggestedFilename } from '../../helpers/export-annotations';
import { withServices } from '../../service-context';
import type { AnnotationsExporter } from '../../services/annotations-exporter';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import LoadingSpinner from './LoadingSpinner';
import { UserAnnotationsListItem } from './UserAnnotationsListItem';

export type ExportAnnotationsProps = {
  // injected
  annotationsExporter: AnnotationsExporter;
  toastMessenger: ToastMessengerService;
};

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
  const currentUser = store.profile().userid;
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

  if (!exportReady) {
    return <LoadingSpinner />;
  }

  const exportAnnotations = (e: Event) => {
    e.preventDefault();

    try {
      const annotationsToExport =
        selectedUser?.annotations ?? exportableAnnotations;
      const filename = `${customFilename ?? defaultFilename}.json`;
      const exportData =
        annotationsExporter.buildExportContent(annotationsToExport);
      downloadJSONFile(exportData, filename);
    } catch (e) {
      toastMessenger.error('Exporting annotations failed');
    }
  };

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
          <p className="text-color-text-light mb-3">
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
          <label
            data-testid="export-count"
            htmlFor={fileInputId}
            className="font-medium"
          >
            Name of export file:
          </label>
          <Input
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
          <label htmlFor={userSelectId} className="block font-medium">
            Select which user{"'"}s annotations to export:
          </label>
          <SelectNext
            value={selectedUser}
            onChange={setSelectedUser}
            buttonId={userSelectId}
            buttonContent={
              <UserAnnotationsListItem userAnnotations={selectedUser} />
            }
          >
            <SelectNext.Option value={allAnnotationsOption}>
              {() => (
                <UserAnnotationsListItem
                  userAnnotations={allAnnotationsOption}
                />
              )}
            </SelectNext.Option>
            {userList.map(userInfo => (
              <SelectNext.Option key={userInfo.userid} value={userInfo}>
                {() => <UserAnnotationsListItem userAnnotations={userInfo} />}
              </SelectNext.Option>
            ))}
          </SelectNext>
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
