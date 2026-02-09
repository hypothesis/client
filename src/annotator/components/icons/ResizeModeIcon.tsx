import type { JSX } from 'preact';

/**
 * Icon for keyboard "resize" mode: frame with corner squares and diagonal
 * arrows with gap in center (top-left to center, bottom-right to center).
 * Used in the toolbar when the rectangle annotation is in resize mode.
 */
export default function ResizeModeIcon(
  props: JSX.SVGAttributes<SVGSVGElement>,
): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...props}
    >
      <g fill-rule="evenodd">
        <path fill="none" d="M0 0h16v16H0z" />
        <path
          fill="currentColor"
          clip-rule="evenodd"
          d="M2.5 0h-1A1.5 1.5 0 0 0 0 1.5v1 a1.5 1.5 0 0 0 1 1.415v8.17 A1.5 1.5 0 0 0 0 13.5v1 A1.5 1.5 0 0 0 1.5 16h1 a1.5 1.5 0 0 0 1.415-1h8.17 a1.5 1.5 0 0 0 1.415 1h1 a1.5 1.5 0 0 0 1.5-1.5v-1 a1.5 1.5 0 0 0-1-1.415v-8.17 A1.5 1.5 0 0 0 16 2.5v-1 A1.5 1.5 0 0 0 14.5 0h-1 a1.5 1.5 0 0 0-1.415 1h-8.17 A1.5 1.5 0 0 0 2.5 0 m9.585 13 c.151-.426.489-.764.915-.915v-8.17 A1.5 1.5 0 0 1 12.085 3h-8.17 c-.151.426-.489.764-.915.915v8.17 c.426.151.764.489.915.915z M1 1.5 a.5.5 0 0 1 .5-.5h1 a.5.5 0 0 1 .5.5v1 a.5.5 0 0 1-.5.5h-1 a.5.5 0 0 1-.5-.5z M1.5 13 a.5.5 0 0 0-.5.5v1 a.5.5 0 0 0 .5.5h1 a.5.5 0 0 0 .5-.5v-1 a.5.5 0 0 0-.5-.5z M13 1.5 a.5.5 0 0 1 .5-.5h1 a.5.5 0 0 1 .5.5v1 a.5.5 0 0 1-.5.5h-1 a.5.5 0 0 1-.5-.5z m.5 11.5 a.5.5 0 0 0-.5.5v1 a.5.5 0 0 0 .5.5h1 a.5.5 0 0 0 .5-.5v-1 a.5.5 0 0 0-.5-.5z"
        />
      </g>
      <g
        transform="translate(3 3) scale(0.0833)"
        stroke="currentColor"
        stroke-width="18"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      >
        <path d="M30 30 L55 55" />
        <path d="M65 65 L90 90" />
        <path d="M30 45 L30 30 L45 30" />
        <path d="M75 90 L90 90 L90 75" />
      </g>
    </svg>
  );
}
