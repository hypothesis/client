import { Panel } from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

export type LaunchErrorPanelProps = {
  /** The error that prevented the client from launching */
  error: Error;
};
/**
 * An error panel displayed when a fatal error occurs during app startup.
 *
 * Note that this component cannot use any of the services or store that are
 * normally available to UI components in the client.
 */
export default function LaunchErrorPanel({ error }: LaunchErrorPanelProps) {
  return (
    <div
      className={classnames(
        // The large top-margin is to ensure the panel clears the close button
        // in the Notebook
        'm-2 mt-12'
      )}
    >
      <Panel title="Unable to start Hypothesis">{error.message}</Panel>
    </div>
  );
}
