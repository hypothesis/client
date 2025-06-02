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
