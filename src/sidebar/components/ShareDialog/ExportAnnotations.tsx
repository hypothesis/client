import {
  Button,
  CardActions,
  Input,
  Select,
} from '@hypothesis/frontend-shared';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { downloadJSONFile } from '../../../shared/download-json-file';
import type { APIAnnotationData } from '../../../types/api';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { annotationsByUser } from '../../helpers/annotations-by-user';
import { withServices } from '../../service-context';
import type { AnnotationsExporter } from '../../services/annotations-exporter';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { suggestedFilename } from '../../util/export-annotations';
import LoadingSpinner from './LoadingSpinner';

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

  // User whose annotations are going to be exported. Preselect current user
  const currentUser = store.profile().userid;
  const [selectedUser, setSelectedUser] = useState(currentUser);

  const draftCount = store.countDrafts();

  const defaultFilename = useMemo(
    () => suggestedFilename({ groupName: group?.name }),
    [group],
  );
  const [customFilename, setCustomFilename] = useState<string>();

  if (!exportReady) {
    return <LoadingSpinner />;
  }

  const exportAnnotations = (e: Event) => {
    e.preventDefault();

    try {
      const annotationsToExport =
        userList.find(item => item.userid === selectedUser)?.annotations ??
        exportableAnnotations;
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
          <label data-testid="export-count" htmlFor="export-filename">
            Name of export file:
          </label>
          <Input
            data-testid="export-filename"
            id="export-filename"
            defaultValue={defaultFilename}
            value={customFilename}
            onChange={e =>
              setCustomFilename((e.target as HTMLInputElement).value)
            }
            required
            maxLength={250}
          />
          <label htmlFor="export-user" className="block">
            Select which user{"'"}s annotations to export:
          </label>
          <Select
            id="export-user"
            onChange={e =>
              setSelectedUser((e.target as HTMLSelectElement).value || null)
            }
          >
            <option value="" selected={!selectedUser}>
              All annotations ({exportableAnnotations.length})
            </option>
            {userList.map(userInfo => (
              <option
                key={userInfo.userid}
                value={userInfo.userid}
                selected={userInfo.userid === selectedUser}
              >
                {userInfo.displayName} ({userInfo.annotations.length})
              </option>
            ))}
          </Select>
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
