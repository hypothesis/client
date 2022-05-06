import { LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../service-context';

/**
 * @typedef VersionInfoProps
 * @prop {import('../helpers/version-data').VersionData} versionData - Object with version information
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * @param {object} props
 *   @param {string} props.label
 *   @param {import('preact').ComponentChildren} props.children
 *   @param {string} [props.classes]
 */
function VersionInfoItem({ label, children, classes }) {
  return (
    <>
      <dt className="col-span-1 sm:text-right font-medium">{label}</dt>
      <dd
        className={classnames(
          'col-span-1 sm:col-span-3 text-color-text-light break-words',
          classes
        )}
      >
        {children}
      </dd>
    </>
  );
}
/**
 * Display current client version info
 *
 * @param {VersionInfoProps} props
 */
function VersionInfo({ toastMessenger, versionData }) {
  const copyVersionData = () => {
    try {
      copyText(versionData.asFormattedString());
      toastMessenger.success('Copied version info to clipboard');
    } catch (err) {
      toastMessenger.error('Unable to copy version info');
    }
  };

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 sm:grid-cols-4 sm:gap-x-2">
        <VersionInfoItem label="Version">{versionData.version}</VersionInfoItem>
        <VersionInfoItem label="User Agent">
          {versionData.userAgent}
        </VersionInfoItem>
        <VersionInfoItem
          classes={classnames(
            // Intermittent odd overflow behavior in Safari causes long strings
            // with no wrap points to break layout — `overflow-wrap: break-words`
            // is not reliable in this case. Use `break-all` here, which causes
            // more inelgant wrapping in all browsers, but is safely contained
            // in the layout.
            // See: https://github.com/hypothesis/client/issues/4469
            'break-all'
          )}
          label="URL"
        >
          {versionData.urls}
        </VersionInfoItem>
        <VersionInfoItem label="Fingerprint">
          {versionData.fingerprint}
        </VersionInfoItem>
        <VersionInfoItem label="Account">{versionData.account}</VersionInfoItem>
        <VersionInfoItem label="Date">{versionData.timestamp}</VersionInfoItem>
      </dl>
      <div className="flex items-center justify-center">
        <LabeledButton onClick={copyVersionData} icon="copy">
          Copy version details
        </LabeledButton>
      </div>
    </div>
  );
}

export default withServices(VersionInfo, ['toastMessenger']);
