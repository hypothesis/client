/**
 * Escape a CSV field value (see https://www.ietf.org/rfc/rfc4180.txt)
 *
 * - foo -> foo
 * - foo,bar -> "foo,bar"
 * - with "quoted" text -> "with ""quoted"" text"
 */
export function escapeCSVValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
