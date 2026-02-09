import type { KeyboardMode, PinnedCorner } from '../../types/annotator';
import { pinnedCornerToLabel } from '../util/pinned-corner';

/**
 * Component that announces changes to pin/rectangle position and size
 * to screen readers using a live region.
 */
export type DrawToolAnnouncerProps = {
  /** Current mode: 'move' for moving, 'resize' for resizing, 'rect' for rectangle, null when inactive */
  mode: KeyboardMode;

  /** Current tool type: 'point' for pin, 'rect' for rectangle */
  tool: 'point' | 'rect' | null;

  /** Which corner is pinned during resize mode */
  pinnedCorner?: PinnedCorner;

  /** Current X coordinate (for point) or left position (for rect) */
  x?: number;

  /** Current Y coordinate (for point) or top position (for rect) */
  y?: number;

  /** Width of rectangle (only for rect tool) */
  width?: number;

  /** Height of rectangle (only for rect tool) */
  height?: number;

  /** Whether keyboard mode is active */
  keyboardActive: boolean;
};

/**
 * Announce current position/size of drawing tool to screen readers.
 *
 * This component renders a hidden live region that announces changes
 * to the position or size of pin/rectangle annotations when using
 * keyboard navigation.
 */
export default function DrawToolAnnouncer({
  mode,
  tool,
  x,
  y,
  width,
  height,
  keyboardActive,
  pinnedCorner,
}: DrawToolAnnouncerProps) {
  if (!keyboardActive || !tool) {
    return null;
  }

  let announcement = '';

  if (tool === 'point') {
    if (mode === 'move' && typeof x === 'number' && typeof y === 'number') {
      announcement = `Pin position: ${Math.round(x)}, ${Math.round(y)}`;
    } else if (mode === 'resize') {
      // Pin doesn't support resize, but announce if mode is set incorrectly
      announcement = 'Pin annotation mode. Use arrow keys to move.';
    } else {
      announcement = 'Pin annotation mode. Use arrow keys to move, Enter to confirm.';
    }
  } else if (tool === 'rect') {
    if (
      mode === 'move' &&
      typeof x === 'number' &&
      typeof y === 'number' &&
      typeof width === 'number' &&
      typeof height === 'number'
    ) {
      announcement = `Rectangle position: ${Math.round(x)}, ${Math.round(y)}. Size: ${Math.round(width)} by ${Math.round(height)} pixels`;
    } else if (
      mode === 'resize' &&
      typeof width === 'number' &&
      typeof height === 'number'
    ) {
      const cornerText = pinnedCornerToLabel(pinnedCorner, 'long');
      announcement = `Rectangle size: ${Math.round(width)} by ${Math.round(height)} pixels. ${cornerText}. Press Tab to change pinned corner.`;
    } else if (mode === 'rect') {
      announcement =
        'Rectangle annotation mode. Click the mode button to switch to Move or Resize mode.';
    } else {
      announcement =
        'Rectangle annotation mode. Use arrow keys to move, Ctrl+Shift+J to resize, Enter to confirm.';
    }
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="sr-only"
      data-testid="draw-tool-announcer"
    >
      {announcement && <span>{announcement}</span>}
    </div>
  );
}
