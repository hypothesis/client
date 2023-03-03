import type { ComponentChildren } from 'preact';

export type BannersProps = { children: ComponentChildren };

/**
 * Render banners at the top of a document in a stacked column.
 */
export default function Banners({ children }: BannersProps) {
  return <div className="flex flex-col">{children}</div>;
}
