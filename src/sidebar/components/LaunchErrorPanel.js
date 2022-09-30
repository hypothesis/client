import { Panel } from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

/**
 * @typedef LaunchErrorPanelProps
 * @prop {Error} error - The error that prevented the client from launching
 */

/**
 * An error panel displayed when a fatal error occurs during app startup.
 *
 * Note that this component cannot use any of the services or store that are
 * normally available to UI components in the client.
 *
 * @param {LaunchErrorPanelProps} props
 */
export default function LaunchErrorPanel({ error }) {
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
