/**
 * Download a file containing JSON-serialized `object` as `filename`
 *
 * @param data - JSON-serializable object
 * @param _document - Test seam
 * @return The contents of the downloaded file
 * @throws {Error} If provided data cannot be JSON-serialized
 */
export function downloadJSONFile(
  data: object,
  filename: string,
  /* istanbul ignore next */
  _document = document,
): string {
  const link = _document.createElement('a');
  const fileContent = JSON.stringify(data, null, 2);
  const blob = new Blob([fileContent], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  _document.body.appendChild(link);
  link.click();
  _document.body.removeChild(link);

  return fileContent;
}
