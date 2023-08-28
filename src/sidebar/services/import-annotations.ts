import type { Annotation, APIAnnotationData } from '../../types/api';
import { quote } from '../helpers/annotation-metadata';
import type { SidebarStore } from '../store';
import type { Frame } from '../store/modules/frames';
import type { AnnotationsService } from './annotations';
import type { ToastMessengerService } from './toast-messenger';

/** Number of annotations to import concurrently. */
export const MAX_CONCURRENT_IMPORTS = 5;

/**
 * Non-standard metadata fields added to imported annotations.
 *
 * These are added for analytics / reporting purposes. If we decide to make
 * other uses of it, we should migrate these to a proper annotation metadata
 * field.
 */
type ImportExtra = {
  extra: {
    /** Indicator for where the annotation came from. */
    source: 'import';

    /** Original ID of the annotation that was imported. */
    original_id?: string;
  };
};

/**
 * The subset of annotation fields which are preserved during an import.
 */
type ImportData = Pick<
  APIAnnotationData,
  'document' | 'tags' | 'text' | 'target' | 'uri'
> &
  ImportExtra;

/**
 * Return a copy of `ann` that contains only fields which can be preserved by
 * an import performed on the client, overwriting some of them with the ones
 * from current frame, if provided
 */
function getImportData(
  ann: APIAnnotationData,
  currentFrame: Frame | null,
): ImportData {
  return {
    target: ann.target,
    tags: ann.tags,
    text: ann.text,
    uri: currentFrame?.uri ?? ann.uri,
    document: currentFrame?.metadata ?? ann.document,
    extra: {
      source: 'import',
      original_id: ann.id,
    },
  };
}

/**
 * Summarize the results of an import operation.
 *
 * Returns an object which can easily mapped to a toast message notification.
 */
function importStatus(results: ImportResult[]): {
  messageType: 'success' | 'notice' | 'error';
  message: string;
} {
  const errorCount = results.filter(r => r.type === 'error').length;
  const errorMessage = errorCount > 0 ? `${errorCount} imports failed` : '';

  const importCount = results.filter(r => r.type === 'import').length;
  const importMessage =
    importCount > 0 ? `${importCount} annotations imported` : '';

  const dupCount = results.filter(r => r.type === 'duplicate').length;
  const dupMessage = dupCount > 0 ? `${dupCount} duplicates skipped` : '';

  let messageType: 'success' | 'notice' | 'error';
  if (errorCount === 0) {
    if (importCount > 0) {
      messageType = 'success';
    } else {
      messageType = 'notice';
    }
  } else if (importCount > 0) {
    messageType = 'notice';
  } else {
    messageType = 'error';
  }

  const message = [importMessage, errorMessage, dupMessage]
    .filter(msg => msg.length > 0)
    .join(', ');

  return { messageType, message };
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((x, i) => b[i] === x);
}

/**
 * Return true if two annotations should be considered duplicates based on their
 * content.
 */
function duplicateMatch(a: APIAnnotationData, b: APIAnnotationData): boolean {
  if (a.text !== b.text) {
    return false;
  }
  if (!arraysEqual(a.tags, b.tags)) {
    return false;
  }
  return quote(a) === quote(b);
}

/**
 * Enum of the result of an import operation for a single annotation.
 */
export type ImportResult =
  /** Annotation was successfully imported. */
  | { type: 'import'; annotation: Annotation }
  /** Annotation was skipped because it is a duplicate. */
  | { type: 'duplicate'; annotation: Annotation }
  /** Annotation import failed. */
  | { type: 'error'; error: Error };

/**
 * Imports annotations from a Hypothesis JSON file.
 *
 * @inject
 */
export class ImportAnnotationsService {
  private _annotationsService: AnnotationsService;
  private _store: SidebarStore;
  private _toastMessenger: ToastMessengerService;

  constructor(
    store: SidebarStore,
    annotationsService: AnnotationsService,
    toastMessenger: ToastMessengerService,
  ) {
    this._store = store;
    this._annotationsService = annotationsService;
    this._toastMessenger = toastMessenger;
  }

  /**
   * Import annotations.
   *
   * Returns an array of the results of each import. The results are in the
   * same order as the input annotation list. Each result can either be a
   * successful import, a skipped import, or an error.
   */
  async import(anns: APIAnnotationData[]): Promise<ImportResult[]> {
    this._store.beginImport(anns.length);

    const existingAnns = this._store.allAnnotations();
    const currentFrame = this._store.mainFrame();

    const importAnn = async (ann: APIAnnotationData): Promise<ImportResult> => {
      const existingAnn = existingAnns.find(ex => duplicateMatch(ann, ex));
      if (existingAnn) {
        return { type: 'duplicate', annotation: existingAnn };
      }

      try {
        // Strip out all the fields that are ignored in an import, and overwrite
        // the URI with current document's URI.
        const importData = getImportData(ann, currentFrame);

        // Fill out the annotation with default values for the current user and
        // group.
        const saveData =
          this._annotationsService.annotationFromData(importData);

        // Persist the annotation.
        const saved = await this._annotationsService.save(saveData);

        return { type: 'import', annotation: saved };
      } catch (error) {
        return { type: 'error', error };
      }
    };

    // Save annotations to the server, allowing a maximum of
    // `MAX_CONCURRENT_IMPORTS` in-flight requests at a time.
    const results: ImportResult[] = [];
    const queue = anns.map((ann, index) => ({ ann, index }));
    const active: Array<Promise<void>> = [];
    while (queue.length > 0) {
      const task = queue.shift()!;
      const done = importAnn(task.ann)
        .then(result => {
          this._store.completeImport(1);
          results[task.index] = result;
        })
        .then(() => {
          const idx = active.indexOf(done);
          // nb. `idx` should always be >= 0 here.
          if (idx !== -1) {
            active.splice(idx, 1);
          }
        });
      active.push(done);

      // When we reach max concurrency, wait for at least one import to complete.
      if (active.length >= MAX_CONCURRENT_IMPORTS) {
        await Promise.race(active);
      }
    }

    // Wait for all remaining imports to complete.
    await Promise.all(active);

    const { messageType, message } = importStatus(results);
    if (messageType === 'success') {
      this._toastMessenger.success(message);
    } else if (messageType === 'notice') {
      this._toastMessenger.notice(message);
    } else if (messageType === 'error') {
      this._toastMessenger.error(message);
    }

    return results;
  }
}
