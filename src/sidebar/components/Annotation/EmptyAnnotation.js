import AnnotationReplyToggle from './AnnotationReplyToggle';

/**
 * @typedef {import('./Annotation').AnnotationProps} AnnotationProps
 * @typedef {Omit<AnnotationProps, 'annotation' | 'annotationsService'>} EmptyAnnotationProps
 */

/**
 * Render an "annotation" when the annotation itself is missing. This can
 * happen when an annotation is deleted by its author but there are still
 * replies that pertain to it.
 *
 * @param {EmptyAnnotationProps} props
 */
export default function EmptyAnnotation({
  isReply,
  replyCount,
  threadIsCollapsed,
  onToggleReplies,
}) {
  return (
    <article
      className="space-y-4"
      aria-label={`${
        isReply ? 'Reply' : 'Annotation'
      } with unavailable content`}
    >
      <div>
        <em>Message not available.</em>
      </div>
      {onToggleReplies && (
        <footer className="flex items-center">
          <AnnotationReplyToggle
            onToggleReplies={onToggleReplies}
            replyCount={replyCount}
            threadIsCollapsed={threadIsCollapsed}
          />
        </footer>
      )}
    </article>
  );
}
