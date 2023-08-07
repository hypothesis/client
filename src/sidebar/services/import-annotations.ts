import type { Annotation, APIAnnotationData } from '../../types/api';
import { quote } from '../helpers/annotation-metadata';
import type { SidebarStore } from '../store';
import type { AnnotationsService } from './annotations';
import type { ToastMessengerService } from './toast-messenger';

/**
 * The subset of annotation fields which are preserved during an import.
 */
type ImportData = Pick<
  APIAnnotationData,
  'document' | 'tags' | 'text' | 'target' | 'uri'
>;

/**
 * Return a copy of `ann` that contains only fields which can be preserved by
 * an import performed on the client.
 */
function getImportData(ann: APIAnnotationData): ImportData {
  return {
    target: ann.target,
    tags: ann.tags,
    text: ann.text,
    uri: ann.uri,
    document: ann.document,
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
   */
  async import(anns: APIAnnotationData[]): Promise<ImportResult[]> {
    this._store.beginImport(anns.length);

    const existingAnns = this._store.allAnnotations();
    const results: ImportResult[] = [];

    for (const ann of anns) {
      const existingAnn = existingAnns.find(ex => duplicateMatch(ann, ex));
      if (existingAnn) {
        results.push({ type: 'duplicate', annotation: existingAnn });
        this._store.completeImport(1);
        continue;
      }

      try {
        // Strip out all the fields that are ignored in an import.
        const importData = getImportData(ann);

        // Fill out the annotation with default values for the current user and
        // group.
        const saveData =
          this._annotationsService.annotationFromData(importData);

        // Persist the annotation.
        const saved = await this._annotationsService.save(saveData);

        results.push({ type: 'import', annotation: saved });
      } catch (error) {
        results.push({ type: 'error', error });
      } finally {
        this._store.completeImport(1);
      }
    }

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
