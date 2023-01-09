import { LinkButton } from '@hypothesis/frontend-shared';

export type AnnotationReplyToggleProps = {
  onToggleReplies: () => void;
  replyCount: number;
  threadIsCollapsed: boolean;
};
/**
 * Render a thread-card control to toggle (expand or collapse) all of this
 * thread's children.
 */
function AnnotationReplyToggle({
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
}: AnnotationReplyToggleProps) {
  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  return (
    <LinkButton onClick={onToggleReplies} title={toggleText}>
      {toggleText}
    </LinkButton>
  );
}

export default AnnotationReplyToggle;
