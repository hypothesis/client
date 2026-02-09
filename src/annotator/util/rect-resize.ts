import type { PinnedCorner } from '../../types/annotator';
import type { Rect } from '../../types/annotator';

export type ActiveEdges = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

export type ResizeConstraints = {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  increment: number;
};

/**
 * Get which edges are active (can be modified) based on the pinned corner.
 * Active edges are the ones NOT adjacent to the pinned corner.
 */
export function getActiveEdges(pinnedCorner: PinnedCorner): ActiveEdges {
  switch (pinnedCorner) {
    case 'top-left':
      return { top: false, right: true, bottom: true, left: false };
    case 'top-right':
      return { top: false, right: false, bottom: true, left: true };
    case 'bottom-right':
      return { top: true, right: false, bottom: false, left: true };
    case 'bottom-left':
      return { top: true, right: true, bottom: false, left: false };
    default:
      return { top: true, right: true, bottom: true, left: true };
  }
}

/**
 * Check if an arrow key can modify the rectangle from the pinned corner.
 * Returns true if the key affects an active edge (expand or contract).
 */
export function canModifyFromPinnedCorner(
  key: string,
  pinnedCorner: PinnedCorner,
): boolean {
  const activeEdges = getActiveEdges(pinnedCorner);
  switch (key) {
    case 'ArrowUp':
      return activeEdges.top || activeEdges.bottom;
    case 'ArrowDown':
      return activeEdges.bottom || activeEdges.top;
    case 'ArrowLeft':
      return activeEdges.left || activeEdges.right;
    case 'ArrowRight':
      return activeEdges.right || activeEdges.left;
    default:
      return false;
  }
}

/**
 * Apply one arrow key to resize a rectangle with the given corner pinned.
 * Returns a new rect; does not mutate the input.
 * Caller must ensure canModifyFromPinnedCorner(key, pinnedCorner) is true.
 */
export function applyResizeArrowKey(
  rect: Rect,
  key: string,
  pinnedCorner: PinnedCorner,
  constraints: ResizeConstraints,
): Rect {
  const { left, top, right, bottom } = rect;
  const { minWidth, minHeight, maxWidth, maxHeight, increment } = constraints;

  const result = { ...rect };

  switch (pinnedCorner) {
    case 'top-left': {
      switch (key) {
        case 'ArrowRight': {
          const newRight = Math.min(left + maxWidth, right + increment);
          if (newRight - left >= minWidth) {
            result.right = newRight;
          }
          break;
        }
        case 'ArrowDown': {
          const newBottom = Math.min(top + maxHeight, bottom + increment);
          if (newBottom - top >= minHeight) {
            result.bottom = newBottom;
          }
          break;
        }
        case 'ArrowLeft':
          result.right = Math.max(left + minWidth, right - increment);
          break;
        case 'ArrowUp':
          result.bottom = Math.max(top + minHeight, bottom - increment);
          break;
      }
      break;
    }
    case 'top-right': {
      switch (key) {
        case 'ArrowRight':
          result.left = Math.min(right - minWidth, left + increment);
          break;
        case 'ArrowDown': {
          const newBottom = Math.min(top + maxHeight, bottom + increment);
          if (newBottom - top >= minHeight) {
            result.bottom = newBottom;
          }
          break;
        }
        case 'ArrowLeft': {
          const newLeft = Math.max(right - maxWidth, left - increment);
          if (right - newLeft >= minWidth) {
            result.left = newLeft;
          }
          break;
        }
        case 'ArrowUp':
          result.bottom = Math.max(top + minHeight, bottom - increment);
          break;
      }
      break;
    }
    case 'bottom-right': {
      switch (key) {
        case 'ArrowRight':
          result.left = Math.min(right - minWidth, left + increment);
          break;
        case 'ArrowDown':
          result.top = Math.min(bottom - minHeight, top + increment);
          break;
        case 'ArrowLeft': {
          const newLeft = Math.max(right - maxWidth, left - increment);
          if (right - newLeft >= minWidth) {
            result.left = newLeft;
          }
          break;
        }
        case 'ArrowUp': {
          const newTop = Math.max(bottom - maxHeight, top - increment);
          if (bottom - newTop >= minHeight) {
            result.top = newTop;
          }
          break;
        }
      }
      break;
    }
    case 'bottom-left': {
      switch (key) {
        case 'ArrowRight': {
          const newRight = Math.min(left + maxWidth, right + increment);
          if (newRight - left >= minWidth) {
            result.right = newRight;
          }
          break;
        }
        case 'ArrowDown':
          result.top = Math.min(bottom - minHeight, top + increment);
          break;
        case 'ArrowLeft':
          result.right = Math.max(left + minWidth, right - increment);
          break;
        case 'ArrowUp': {
          const newTop = Math.max(bottom - maxHeight, top - increment);
          if (bottom - newTop >= minHeight) {
            result.top = newTop;
          }
          break;
        }
      }
      break;
    }
  }

  return result;
}
