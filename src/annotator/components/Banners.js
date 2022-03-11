/**
 * Render banners at the top of a document in a stacked column.
 *
 * @param {object} props
 *   @param {import("preact").ComponentChildren} props.children
 */
export default function Banners({ children }) {
  return <div className="flex flex-col">{children}</div>;
}
