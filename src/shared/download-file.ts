function downloadFile(
  content: string,
  type: string,
  filename: string,
  document: Document,
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download a file containing JSON-serialized `object` as `filename`
 *
 * @param data - JSON-serializable object
 * @return The contents of the downloaded file
 * @throws {Error} If provided data cannot be JSON-serialized
 */
export function downloadJSONFile(
  data: object,
  filename: string,
  /* istanbul ignore next - test seam */
  _document = document,
): string {
  const fileContent = JSON.stringify(data, null, 2);
  downloadFile(fileContent, 'application/json', filename, _document);

  return fileContent;
}

/**
 * Download a text file containing data
 */
export function downloadTextFile(
  data: string,
  filename: string,
  /* istanbul ignore next - test seam */
  _document = document,
) {
  downloadFile(data, 'text/plain', filename, _document);
}
