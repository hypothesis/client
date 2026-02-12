import type { KeyboardMode, PinnedCorner, Shape } from '../../types/annotator';
import { normalizeRect } from '../util/draw-tool-position';
import { getActiveEdges } from '../util/rect-resize';

export type DrawToolSurfaceProps = {
  shape: Shape | undefined;
  waitingForSecondClick: boolean;
  firstClickPoint: { x: number; y: number } | undefined;
  keyboardMode: KeyboardMode;
  keyboardActive: boolean;
  pinnedCorner: PinnedCorner;
};

const ACTIVE_EDGE_COLOR = '#374151';
const INACTIVE_EDGE_COLOR = 'grey';

/**
 * Renders the current draw-tool shape (rect or point) or the two-click indicator
 * into the SVG surface.
 */
export function DrawToolSurface({
  shape,
  waitingForSecondClick,
  firstClickPoint,
  keyboardMode,
  keyboardActive,
  pinnedCorner,
}: DrawToolSurfaceProps) {
  if (shape?.type === 'rect') {
    if (waitingForSecondClick && firstClickPoint) {
      const { x, y } = firstClickPoint;
      return (
        <>
          <circle
            stroke="grey"
            stroke-width="2px"
            fill="none"
            cx={x}
            cy={y}
            r={8}
          />
          <line
            stroke="grey"
            stroke-width="1px"
            x1={x - 12}
            y1={y}
            x2={x + 12}
            y2={y}
          />
          <line
            stroke="grey"
            stroke-width="1px"
            x1={x}
            y1={y - 12}
            x2={x}
            y2={y + 12}
          />
        </>
      );
    }

    const rect = normalizeRect(shape);
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const activeEdges =
      keyboardMode === 'resize' && keyboardActive
        ? getActiveEdges(pinnedCorner)
        : { top: false, right: false, bottom: false, left: false };

    return (
      <>
        {/* Background fill - white dashed stroke so grey dashes show through from next rect */}
        <rect
          stroke="white"
          stroke-dasharray="5"
          stroke-width="1px"
          fill="grey"
          fill-opacity="0.5"
          x={rect.left}
          y={rect.top}
          width={width}
          height={height}
        />
        {/* Base border - grey dashed, offset to alternate with white */}
        <rect
          stroke={INACTIVE_EDGE_COLOR}
          stroke-dasharray="5"
          stroke-dashoffset="5"
          stroke-width="1px"
          fill="none"
          x={rect.left}
          y={rect.top}
          width={width}
          height={height}
        />
        {/* Active edges overlay in resize mode - dashed dark grey on active edges only */}
        {keyboardMode === 'resize' && keyboardActive && (
          <>
            <line
              x1={rect.left}
              y1={rect.top}
              x2={rect.right}
              y2={rect.top}
              stroke={activeEdges.top ? ACTIVE_EDGE_COLOR : 'transparent'}
              stroke-width="3px"
              stroke-dasharray="5"
              stroke-dashoffset="5"
            />
            <line
              x1={rect.right}
              y1={rect.top}
              x2={rect.right}
              y2={rect.bottom}
              stroke={activeEdges.right ? ACTIVE_EDGE_COLOR : 'transparent'}
              stroke-width="3px"
              stroke-dasharray="5"
              stroke-dashoffset="5"
            />
            <line
              x1={rect.left}
              y1={rect.bottom}
              x2={rect.right}
              y2={rect.bottom}
              stroke={activeEdges.bottom ? ACTIVE_EDGE_COLOR : 'transparent'}
              stroke-width="3px"
              stroke-dasharray="5"
              stroke-dashoffset="5"
            />
            <line
              x1={rect.left}
              y1={rect.top}
              x2={rect.left}
              y2={rect.bottom}
              stroke={activeEdges.left ? ACTIVE_EDGE_COLOR : 'transparent'}
              stroke-width="3px"
              stroke-dasharray="5"
              stroke-dashoffset="5"
            />
          </>
        )}
      </>
    );
  }

  if (shape?.type === 'point') {
    const point = shape;
    return (
      <circle
        stroke="black"
        stroke-width="1px"
        fill="yellow"
        cx={point.x}
        cy={point.y}
        r={5}
      />
    );
  }

  return null;
}
