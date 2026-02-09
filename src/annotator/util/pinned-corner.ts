import type { PinnedCorner } from '../../types/annotator';

/**
 * Format for corner label used in announcer (e.g. "top-left corner pinned")
 * or short for indicator (e.g. "top-left").
 */
export type PinnedCornerLabelFormat = 'short' | 'long';

/**
 * Return a human-readable label for the pinned corner in resize mode.
 */
export function pinnedCornerToLabel(
  corner: PinnedCorner | undefined,
  format: PinnedCornerLabelFormat = 'short',
): string {
  const c = corner ?? 'top-left';
  if (format === 'long') {
    return `${c} corner pinned`;
  }
  return c;
}
