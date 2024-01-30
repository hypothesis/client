/**
 * Copy the string `text` to the clipboard verbatim.
 *
 * @throws {Error}
 *   This function may throw an error if the `clipboard-write` permission was
 *   not allowed.
 */
export async function copyPlainText(text: string, navigator_ = navigator) {
  await navigator_.clipboard.writeText(text);
}

/**
 * Copy the string `text` to the clipboard with an HTML media type.
 *
 * @throws {Error}
 *   This function may throw an error if the `clipboard-write` permission was
 *   not allowed.
 */
export async function copyHTML(
  text: string,
  /* istanbul ignore next - test seam */
  navigator_ = navigator,
  /* istanbul ignore next - test seam */
  document_ = document,
) {
  // We want to copy the `text` both with plain and html media types, to make
  // sure it is possible to paste in both rich text and plain text contexts.
  // For the second one, the raw HTML markup will be pasted.
  const types = ['text/html', 'text/plain'];

  if (navigator_.clipboard.write) {
    const blobs = types.reduce<Record<string, Blob>>((acc, type) => {
      acc[type] = new Blob([text], { type });
      return acc;
    }, {});
    await navigator_.clipboard.write([new ClipboardItem(blobs)]);
  } else {
    // Fallback to deprecated document.execCommand('copy') on the assumptions
    // that all browsers will implement the new clipboard API before removing
    // the deprecated one.
    const copyHandler = (e: ClipboardEvent) => {
      types.forEach(type => e.clipboardData?.setData(type, text));
      e.preventDefault();
    };

    document_.addEventListener('copy', copyHandler);
    try {
      document_.execCommand('copy');
    } finally {
      document_.removeEventListener('copy', copyHandler);
    }
  }
}
