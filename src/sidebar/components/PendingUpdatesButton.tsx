import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared/lib/next';

export type PendingUpdatesButtonProps = {
  pendingUpdateCount: number;
  onClick: () => void;
};

export default function PendingUpdatesButton({
  pendingUpdateCount,
  onClick,
}: PendingUpdatesButtonProps) {
  if (pendingUpdateCount === 0) {
    // The "wrapper" has to be always present for the aria-live to work
    return <span aria-live="polite" />;
  }

  const title = `Show ${pendingUpdateCount} new/updated ${
    pendingUpdateCount === 1 ? 'annotation' : 'annotations'
  }`;

  return (
    <span aria-live="polite">
      <IconButton
        icon={RefreshIcon}
        onClick={onClick}
        size="xs"
        variant="primary"
        title={title}
      />
      <span className="sr-only">{title}</span>
    </span>
  );
}
