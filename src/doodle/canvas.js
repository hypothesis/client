import { createElement } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

const Canvas = ({
  width,
  height,
  handleMouseDown,
  handleMouseUp,
  handleMouseMove,
  handleMouseLeave,
  lines,
}) => {
  const canvasRef = useRef(null);

  const drawLine = (ctx, line) => {
    if (line.points.length <= 1) {
      return;
    }
    const [[startX, startY], ...rest] = line.points;
    // Move to the first point, begin the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineWidth = line.size;

    if (line.tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = line.color;
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }

    // Draw the rest of the lines
    for (let [x, y] of rest) {
      ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw all of the lines (reverse order so that erasing works)
    for (let i = lines.length - 1; i >= 0; i--) {
      drawLine(ctx, lines[i]);
    }
  }, [lines]);

  return (
    <canvas
      width={width}
      height={height}
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

Canvas.propTypes = {
  width: propTypes.number.isRequired,
  height: propTypes.number.isRequired,
  handleMouseDown: propTypes.func.isRequired,
  handleMouseUp: propTypes.func.isRequired,
  handleMouseMove: propTypes.func.isRequired,
  handleMouseLeave: propTypes.func.isRequired,
  lines: propTypes.array.isRequired,
};

export { Canvas };
