import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { quote } from '../util/annotation-metadata';
import { withServices } from '../util/service-context';

import AnnotationHeader from './annotation-header';
import AnnotationQuote from './annotation-quote';

/**
 * The "new", migrated-to-preact annotation component.
 */
function AnnotationOmega({
  annotation,
  onReplyCountClick,
  permissions,
  replyCount,
  showDocumentInfo,
}) {
  /**
   * @FIXME: This is TEMPORARY to avoid an error in console when creating new
   * annotations from the annotator. It does not have long to live.
   */
  if (!annotation.permissions) {
    annotation.permissions = permissions.default(
      annotation.user,
      annotation.group
    );
  }
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

  /** Injected services */
  permissions: propTypes.object.isRequired,
};

AnnotationOmega.injectedProps = ['permissions'];

export default withServices(AnnotationOmega);
