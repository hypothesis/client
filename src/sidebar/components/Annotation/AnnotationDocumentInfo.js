import { Link } from '@hypothesis/frontend-shared';

/**
 * @typedef AnnotationDocumentInfoProps
 * @prop {string} [domain] - The domain associated with the document
 * @prop {string} [link] - A link to the document (directly)
 * @prop {string} title - The document's title
 */

/**
 * Render some metadata about an annotation's document and link to it
 * if a link is available.
 *
 * @param {AnnotationDocumentInfoProps} props
 */
export default function AnnotationDocumentInfo({ domain, link, title }) {
  return (
    <div className="hyp-u-layout-row hyp-u-horizontal-spacing--2">
      <div className="text-color-text-light">
        on &quot;
        {link ? (
          <Link href={link} target="_blank">
            {title}
          </Link>
        ) : (
          <span>{title}</span>
        )}
        &quot;
      </div>
      {domain && <span className="text-color-text-light">({domain})</span>}
    </div>
  );
}
