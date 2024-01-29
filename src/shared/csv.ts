export type CSVSeparator = ',' | '\t';

/**
 * Escape a CSV field value (see https://www.ietf.org/rfc/rfc4180.txt)
 *
 * - foo -> foo
 * - foo,bar -> "foo,bar"
 * - with "quoted" text -> "with ""quoted"" text"
 *
 * @param separator - Indicates the separator used in the CSV
 */
export function escapeCSVValue(value: string, separator: CSVSeparator): string {
  const regexp = new RegExp(`["\n\r${separator}]`);
  return regexp.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
