import { ButtonBase } from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

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
    <ButtonBase
      classes={classnames(
        // This button has a non-standard color combination: it uses a lighter
        // text color than other LinkButtons
        'text-grey-7 enabled:hover:text-brand-dark',
        'no-underline enabled:hover:underline'
      )}
      expanded={!threadIsCollapsed}
      onClick={onToggleReplies}
      title={toggleText}
    >
      {toggleText}
    </ButtonBase>
  );
}

export default AnnotationReplyToggle;
