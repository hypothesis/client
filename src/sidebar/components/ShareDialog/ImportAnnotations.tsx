import {
  Button,
  CardActions,
  Link,
  SelectNext,
} from '@hypothesis/frontend-shared';
import { useCallback, useEffect, useId, useMemo, useState } from 'preact/hooks';

import type { APIAnnotationData } from '../../../types/api';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { annotationsByUser } from '../../helpers/annotations-by-user';
import { readExportFile } from '../../helpers/import';
import { withServices } from '../../service-context';
import type { ImportAnnotationsService } from '../../services/import-annotations';
import { useSidebarStore } from '../../store';
import CircularProgress from '../CircularProgress';
import FileInput from './FileInput';
import { UserAnnotationsListItem } from './UserAnnotationsListItem';

export type ImportAnnotationsProps = {
  importAnnotationsService: ImportAnnotationsService;
};

/**
 * Content of "Import" tab of annotation share dialog.
 *
 * This allows the user to select a previously exported file of annotations
 * and initiate an import via {@link ImportAnnotationsService}.
 */
function ImportAnnotations({
  importAnnotationsService,
}: ImportAnnotationsProps) {
  const [file, setFile] = useState<File | null>(null);

  // Annotations extracted from `file`.
  const [annotations, setAnnotations] = useState<APIAnnotationData[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const store = useSidebarStore();
  const currentUser = store.profile().userid;

  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');
  const getDisplayName = useCallback(
    (ann: APIAnnotationData) =>
      annotationDisplayName(ann, defaultAuthority, displayNamesEnabled),
    [defaultAuthority, displayNamesEnabled],
  );
  const userList = useMemo(
    () =>
      annotations
        ? annotationsByUser({
            annotations,
            getDisplayName,
            // We decided to exclude replies from the initial implementation of
            // annotation import, to simplify the feature.
            excludeReplies: true,
          })
        : null,
    [annotations, getDisplayName],
  );

  // User whose annotations are going to be imported.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => userList?.find(user => user.userid === selectedUserId) ?? null,
    [selectedUserId, userList],
  );

  // Parse input file, extract annotations and update the user list.
  useEffect(() => {
    if (!currentUser || !file) {
      return;
    }
    setAnnotations(null);
    setError(null);
    setSelectedUserId(null);
    readExportFile(file)
      .then(annotations => {
        setAnnotations(annotations);

        // Pre-select the current user in the list, if at least one of the
        // annotations was authored by them.
        const userMatch = annotations.some(ann => ann.user === currentUser);
        setSelectedUserId(userMatch ? currentUser : null);
      })
      .catch(err => {
        setError(err.message);
      });
  }, [currentUser, file]);

  let importAnnotations;
  if (selectedUser) {
    importAnnotations = async () => {
      // nb. In the event of an error, `import` will report that directly via
      // a toast message, so we don't do that ourselves.
      importAnnotationsService.import(selectedUser.annotations);
    };
  }

  const fileInputId = useId();
  const userSelectId = useId();

  if (!currentUser) {
    // TODO - Make "Log in" a link.
    return (
      <p data-testid="log-in-message">You must log in to import annotations.</p>
    );
  }

  // In order to perform an import, we need:
  //
  //  1. A group to import into
  //  2. A frame from which to get the document URI and metadata
  //  3. Existing annotations for the group loaded so we can de-duplicate against
  //     them
  //  4. A file to import from and a selection of what to import
  //     (`importAnnotations` will be falsey if this is not the case).
  const importReady = Boolean(
    store.focusedGroup() &&
      store.defaultContentFrame() &&
      store.hasFetchedAnnotations() &&
      !store.isFetchingAnnotations() &&
      importAnnotations,
  );

  // True if we're validating a JSON file after it has been selected.
  const parseInProgress = file && !annotations && !error;

  // True if we're validating or importing.
  const importsPending = store.importsPending();
  const importsTotal = store.importsTotal();
  const importsCompleted = importsTotal - importsPending;

  const busy = parseInProgress || importsPending > 0;

  const importProgress =
    importsPending > 0
      ? Math.round((importsCompleted / importsTotal) * 100)
      : null;

  return (
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
        about importing annotations.
      </p>
      <label htmlFor={fileInputId} className="font-medium">
        Select Hypothesis export file:
      </label>
      <FileInput onFileSelected={setFile} disabled={busy} id={fileInputId} />
      {userList && (
        <>
          <label htmlFor={userSelectId} className="block font-medium">
            Select which user&apos;s annotations to import:
          </label>
          <SelectNext
            value={selectedUser}
            onChange={newValue => setSelectedUserId(newValue?.userid ?? null)}
            buttonId={userSelectId}
            buttonContent={
              selectedUser ? (
                <UserAnnotationsListItem userAnnotations={selectedUser} />
              ) : (
                <span className="text-grey-6">Select a user...</span>
              )
            }
          >
            {userList.map(userInfo => (
              <SelectNext.Option key={userInfo.userid} value={userInfo}>
                {() => <UserAnnotationsListItem userAnnotations={userInfo} />}
              </SelectNext.Option>
            ))}
          </SelectNext>
        </>
      )}
      {error && (
        // TODO - Add a support link here.
        <p data-testid="error-info">
          <b>Unable to find annotations to import:</b> {error}
        </p>
      )}
      <CardActions>
        {importProgress !== null && (
          <span data-testid="progress-text" className="text-grey-6">
            {importProgress}% complete
          </span>
        )}
        <Button
          data-testid="import-button"
          disabled={!importReady || busy}
          onClick={importAnnotations}
          variant="primary"
        >
          {importProgress !== null && (
            <CircularProgress size={22} value={importProgress} />
          )}
          Import
        </Button>
      </CardActions>
    </>
  );
}

export default withServices(ImportAnnotations, ['importAnnotationsService']);
