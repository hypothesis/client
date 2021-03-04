import propTypes from 'prop-types';

/** @typedef {import("../../../types/api").Annotation} Annotation */

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
    <div className="AnnotationDocumentInfo u-layout-row u-horizontal-rhythm">
      <div className="AnnotationDocumentInfo__title u-color-text--muted">
        on &quot;
        {link ? <a href={link}>{title}</a> : <span>{title}</span>}
        &quot;
      </div>
      {domain && (
        <div className="AnnotationDocumentInfo__domain u-color-text--muted">
          ({domain})
        </div>
      )}
    </div>
  );
}

AnnotationDocumentInfo.propTypes = {
  domain: propTypes.string,
  link: propTypes.string,
  title: propTypes.string.isRequired,
};
