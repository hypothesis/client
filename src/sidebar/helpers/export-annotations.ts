import type { DocumentMetadata } from '../../types/annotator';

/** Format a date as an ISO `YYYY-MM-DD` string. */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export type SuggestedFilenameOptions = {
  /** Metadata of the document the annotations are associated with. */
  documentMetadata?: DocumentMetadata;

  /** Name of the group containing the exported annotations. */
  groupName?: string;

  /** Date of the export. Defaults to the current date. */
  date?: Date;
};

/**
 * Generate a default filename for a file containing an exported set of
 * annotations.
 *
 * The generated filename may not meet the character, length or other
 * restrictions of the user's system. It is assumed the browser will modify the
 * filename as needed when it downloads the file.
 */
export function suggestedFilename({
  documentMetadata,
  groupName,
  /* istanbul ignore next - test seam */
  date = new Date(),
}: SuggestedFilenameOptions) {
  const filenameSegments = [formatDate(date)];

  if (documentMetadata?.title) {
    filenameSegments.push(documentMetadata.title);
  } else {
    filenameSegments.push('Hypothesis');
  }

  if (groupName) {
    filenameSegments.push(groupName.replace(/ /g, '-'));
  }

  return filenameSegments.join('-');
}
