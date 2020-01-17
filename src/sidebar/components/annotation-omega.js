import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { quote } from '../util/annotation-metadata';

import AnnotationHeader from './annotation-header';
import AnnotationQuote from './annotation-quote';

/**
 * The "new", migrated-to-preact annotation component.
 */
function AnnotationOmega({
  annotation,
  onReplyCountClick,
  replyCount,
  showDocumentInfo,
}) {
  const draft = useStore(store => store.getDraft(annotation));

  // Annotation metadata
  const hasQuote = !!quote(annotation);

  // Local component state
  // TODO: `isEditing` will also take into account `isSaving`
  const isEditing = !!draft;

  return (
    <div className="annotation-omega">
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        onReplyCountClick={onReplyCountClick}
        replyCount={replyCount}
        showDocumentInfo={showDocumentInfo}
      />
      {hasQuote && <AnnotationQuote annotation={annotation} />}
    </div>
  );
}

AnnotationOmega.propTypes = {
  annotation: propTypes.object.isRequired,

  /** Callback for reply-count clicks */
  onReplyCountClick: propTypes.func.isRequired,
  /** Number of replies to this annotation (thread) */
  replyCount: propTypes.number.isRequired,
  /** Should extended document info be rendered (e.g. in non-sidebar contexts)? */
  showDocumentInfo: propTypes.bool.isRequired,
};

export default AnnotationOmega;
