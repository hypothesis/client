import { Button, CardActions, Input } from '@hypothesis/frontend-shared';
import { useMemo, useState } from 'preact/hooks';

import { downloadJSONFile } from '../../../shared/download-json-file';
import { withServices } from '../../service-context';
import type { AnnotationsExporter } from '../../services/annotations-exporter';
import { useSidebarStore } from '../../store';
import {
  suggestedFilename,
  validateFilename,
} from '../../util/export-annotations';
import LoadingSpinner from './LoadingSpinner';

export type ExportAnnotationsProps = {
  // injected
  annotationsExporter: AnnotationsExporter;
};

// TODO: does the Input need a label?

/**
 * Render content for "export" tab panel: allow user to export annotations
 * with a specified filename.
 */
function ExportAnnotations({ annotationsExporter }: ExportAnnotationsProps) {
  const store = useSidebarStore();
  const group = store.focusedGroup();
  const exportReady = group && !store.isLoading();
  const exportableAnnotations = store.savedAnnotations();
  const exportCount = exportableAnnotations.length;
  const draftCount = store.countDrafts();

  const [inputValue, setInputValue] = useState<string>(
    suggestedFilename({ group }),
  );
  const isValidFilename = useMemo(
    () => validateFilename(inputValue),
    [inputValue],
  );

  if (!exportReady) {
    return <LoadingSpinner />;
  }

  const exportAnnotations = () => {
    const filename = `${inputValue}.json`;
    const exportData = annotationsExporter.buildExportContent(
      exportableAnnotations,
    );
    downloadJSONFile(exportData, filename);
  };

  // Naive simple English pluralization
  const pluralize = (str: string, count: number) => {
    return count === 1 ? str : `${str}s`;
  };

  return (
    <>
      {exportCount > 0 ? (
        <>
          <p data-testid="export-count">
            Export{' '}
            <strong>
              {exportCount} {pluralize('annotation', exportCount)}
            </strong>{' '}
            in a file named:
          </p>
          <Input
            data-testid="export-filename"
            id="export-filename"
            value={inputValue}
            onInput={e => setInputValue((e.target as HTMLInputElement).value)}
            hasError={!isValidFilename}
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
          disabled={!exportCount || !isValidFilename}
          onClick={exportAnnotations}
        >
          Export
        </Button>
      </CardActions>
    </>
  );
}

export default withServices(ExportAnnotations, ['annotationsExporter']);
