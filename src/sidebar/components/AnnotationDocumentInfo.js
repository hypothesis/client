import propTypes from 'prop-types';

import * as annotationMetadata from '../helpers/annotation-metadata';

/** @typedef {import("../../types/api").Annotation} Annotation */

/**
 * @typedef AnnotationDocumentInfoProps
 * @prop {Annotation} annotation - Annotation for which the document metadata will be rendered
 */

/**
 * Render some metadata about an annotation's document and link to it
 * if a link is available.
 *
 * @param {AnnotationDocumentInfoProps} props
 */
export default function AnnotationDocumentInfo({ annotation }) {
  const documentInfo = annotationMetadata.domainAndTitle(annotation);
  // If there's no document title, nothing to do here
  if (!documentInfo.titleText) {
    return null;
  }

  return (
    <div className="AnnotationDocumentInfo u-layout-row u-horizontal-rhythm">
      <div className="AnnotationDocumentInfo__title u-color-text--muted">
        on &quot;
        {documentInfo.titleLink ? (
          <a href={documentInfo.titleLink}>{documentInfo.titleText}</a>
        ) : (
          <span>{documentInfo.titleText}</span>
        )}
        &quot;
      </div>
      {documentInfo.domain && (
        <div className="AnnotationDocumentInfo__domain u-color-text--muted">
          ({documentInfo.domain})
        </div>
      )}
    </div>
  );
}

AnnotationDocumentInfo.propTypes = {
  annotation: propTypes.object.isRequired,
};
