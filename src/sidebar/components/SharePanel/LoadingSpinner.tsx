import { Spinner } from '@hypothesis/frontend-shared';

/**
 * Render a consistently sized and positioned loading spinner for dialog or
 * tab content
 */
export default function LoadingSpinner() {
  return (
    <div
      className="flex flex-row items-center justify-center"
      data-testid="loading-spinner"
    >
      <Spinner size="md" />
    </div>
  );
}
