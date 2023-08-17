import { Button, CardActions, Input } from '@hypothesis/frontend-shared';
import { useMemo, useState } from 'preact/hooks';

import { downloadJSONFile } from '../../../shared/download-json-file';
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
  const exportCount = exportableAnnotations.length;
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
      const filename = `${customFilename ?? defaultFilename}.json`;
      const exportData = annotationsExporter.buildExportContent(
        exportableAnnotations,
      );
      downloadJSONFile(exportData, filename);
    } catch (e) {
      toastMessenger.error('Exporting annotations failed');
    }
  };

  // Naive simple English pluralization
  const pluralize = (str: string, count: number) => {
    return count === 1 ? str : `${str}s`;
  };

  return (
    <form
      className="space-y-3"
      onSubmit={exportAnnotations}
      data-testid="export-form"
    >
      {exportCount > 0 ? (
        <>
          <label data-testid="export-count" htmlFor="export-filename">
            Export{' '}
            <strong>
              {exportCount} {pluralize('annotation', exportCount)}
            </strong>{' '}
            in a file named:
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
        </>
      ) : (
        <p data-testid="no-annotations-message">
          There are no annotations available for export.
        </p>
      )}
      {draftCount > 0 && (
        <p data-testid="drafts-message">
          You have {draftCount} unsaved {pluralize('annotation', draftCount)}
          {exportCount > 0 && <> that will not be included</>}.
        </p>
      )}
      <CardActions>
        <Button
          data-testid="export-button"
          variant="primary"
          disabled={!exportCount}
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
