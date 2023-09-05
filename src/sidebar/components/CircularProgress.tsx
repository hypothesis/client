export type CircularProgressProps = {
  /** Width and height of the indicator in pixels. */
  size: number;

  /** Progress value between 0 and 100. */
  value: number;
};

/**
 * A compact circular progress indicator.
 */
export default function CircularProgress({
  size,
  value,
}: CircularProgressProps) {
  const strokeWidth = 2;

  // Internal diameter of circle.
  const diameter = size - 2 * strokeWidth;
  const circumference = Math.PI * diameter;

  return (
    <span
      // This assumes a dark background. We'll need a variant for light
      // backgrounds at some point.
      className="text-grey-3"
      role="progressbar"
      aria-valuenow={value}
      style={{
        width: `${size}px`,
        height: `${size}px`,

        // Orient circle so that stroke is drawn starting from the top. By
        // default it starts from 3 o'clock and goes clockwise.
        transform: 'rotate(-90deg)',
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={diameter / 2}
          fill="none"
          stroke="currentColor"
          // eslint-disable-next-line
          stroke-width={strokeWidth}
          style={{
            // Stroke circle with a single dash, shortened by an offset that
            // depends on the value.
            strokeDasharray: circumference,
            strokeDashoffset: `${
              circumference - circumference * (value / 100)
            }px`,
            transitionDuration: '300ms',
            transitionProperty: 'stroke-dashoffset',
          }}
        />
      </svg>
    </span>
  );
}
