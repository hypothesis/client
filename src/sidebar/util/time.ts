/**
 * Formats a date as `YYYY-MM-DD hh:mm`, using 24h and system timezone.
 *
 * This format has these useful characteristics:
 * - Easy to read (compared to an ISO date).
 * - Lexicographic and chronological order match.
 * - It is detected and correctly parsed as "date" when pasted in common
 *   spreadsheet editors, making it useful when exporting dates for CSV
 *   documents.
 */
export function formatSortableDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
