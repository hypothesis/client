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

  URL.revokeObjectURL(url);
}

function buildTextFileDownloader(type: string) {
  return (
    text: string,
    filename: string,
    /* istanbul ignore next - test seam */
    _document = document,
  ) => downloadFile(text, type, filename, _document);
}

export const downloadJSONFile = buildTextFileDownloader('application/json');

export const downloadTextFile = buildTextFileDownloader('text/plain');

export const downloadCSVFile = buildTextFileDownloader('text/csv');

export const downloadHTMLFile = buildTextFileDownloader('text/html');
