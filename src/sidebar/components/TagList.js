/**
 * @typedef TagListProps
 * @prop {import("preact").ComponentChildren} children
 */

/**
 * Render a list container for a list of annotation tags.
 *
 * @param {TagListProps} props
 */
function TagList({ children }) {
  return (
    <ul
      className="flex flex-wrap gap-2 leading-none"
      aria-label="Annotation tags"
    >
      {children}
    </ul>
  );
}

export default TagList;
