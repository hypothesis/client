export function downloadFile(
  content: string,
  type: string,
  filename: string,
  /* istanbul ignore next - test seam */
  document_ = document,
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document_.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document_.body.appendChild(link);
  link.click();
  document_.body.removeChild(link);

  URL.revokeObjectURL(url);
}
