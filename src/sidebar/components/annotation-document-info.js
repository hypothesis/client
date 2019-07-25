'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const annotationMetadata = require('../util/annotation-metadata');

/**
 * Render some metadata about an annotation's document and link to it
 * if a link is available.
 */
function AnnotationDocumentInfo({ annotation }) {
  const documentInfo = annotationMetadata.domainAndTitle(annotation);
  // If there's no document title, nothing to do here
  if (!documentInfo.titleText) {
    return null;
  }

  return (
    <div className="annotation-document-info">
      <div className="annotation-document-info__title">
        on &quot;
        {documentInfo.titleLink ? (
          <a href={documentInfo.titleLink}>{documentInfo.titleText}</a>
        ) : (
          <span>{documentInfo.titleText}</span>
        )}
        &quot;
      </div>
      {documentInfo.domain && (
        <div className="annotation-document-info__domain">
          ({documentInfo.domain})
        </div>
      )}
    </div>
  );
}

AnnotationDocumentInfo.propTypes = {
  /* Annotation for which the document metadata will be rendered */
  annotation: propTypes.object.isRequired,
};

module.exports = AnnotationDocumentInfo;
