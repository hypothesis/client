import type { KeyboardMode, PinnedCorner } from '../../types/annotator';
import { pinnedCornerToLabel } from '../util/pinned-corner';

/**
 * Visual indicator showing the current keyboard mode (move/resize) for drawing tools.
 * This provides visual feedback to users when keyboard mode is active.
 */
export type DrawToolKeyboardIndicatorProps = {
  /** Current mode: 'move' for moving, 'resize' for resizing, 'rect' for rectangle, null when inactive */
  mode: KeyboardMode;

  /** Whether keyboard mode is active */
  keyboardActive: boolean;

  /** Which corner is pinned during resize mode */
  pinnedCorner?: PinnedCorner;
};

/**
 * Visual indicator for keyboard drawing mode.
 *
 * Displays a small overlay showing the current mode (move/resize) when
 * keyboard mode is active. This helps users understand the current state
 * without relying solely on screen reader announcements.
 */
export default function DrawToolKeyboardIndicator({
  mode,
  keyboardActive,
  pinnedCorner,
}: DrawToolKeyboardIndicatorProps) {
  if (!keyboardActive || !mode) {
    return null;
  }

  const modeText =
    mode === 'move' ? 'Move' : mode === 'resize' ? 'Resize' : 'Rectangle';
  let instructions: string;
  if (mode === 'move') {
    instructions =
      'Use arrow keys to move, click mode button to switch modes, Enter to confirm';
  } else if (mode === 'resize') {
    const cornerText = pinnedCornerToLabel(pinnedCorner, 'short');
    instructions = `Use arrow keys to resize (${cornerText} corner pinned), Tab to change corner, click mode button to switch modes, Enter to confirm`;
  } else {
    instructions =
      'Rectangle mode. Click the mode button to switch to Move or Resize mode.';
  }

  return (
    <div
      className="fixed bottom-4 right-4 bg-white border border-grey-3 rounded shadow-lg p-3 z-50 pointer-events-none"
      data-testid="draw-tool-keyboard-indicator"
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-semibold text-grey-9">
        Keyboard mode: {modeText}
      </div>
      <div className="text-xs text-grey-6 mt-1">{instructions}</div>
    </div>
  );
}
