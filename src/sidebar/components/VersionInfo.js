import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../service-context';

import Button from './Button';

/**
 * @typedef VersionInfoProps
 * @prop {import('../helpers/version-data').default} versionData - Object with version information
 * @prop {Object} toastMessenger - Injected service
 */

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
    <div className="u-vertical-rhythm">
      <dl className="VersionInfo">
        <dt className="VersionInfo__key">Version</dt>
        <dd className="VersionInfo__value">{versionData.version}</dd>
        <dt className="VersionInfo__key">User Agent</dt>
        <dd className="VersionInfo__value">{versionData.userAgent}</dd>
        <dt className="VersionInfo__key">URL</dt>
        <dd className="VersionInfo__value">{versionData.url}</dd>
        <dt className="VersionInfo__key">Fingerprint</dt>
        <dd className="VersionInfo__value">{versionData.fingerprint}</dd>
        <dt className="VersionInfo__key">Account</dt>
        <dd className="VersionInfo__value">{versionData.account}</dd>
        <dt className="VersionInfo__key">Date</dt>
        <dd className="VersionInfo__value">{versionData.timestamp}</dd>
      </dl>
      <div className="u-layout-row--justify-center">
        <Button
          buttonText="Copy version details"
          onClick={copyVersionData}
          icon="copy"
        />
      </div>
    </div>
  );
}

VersionInfo.injectedProps = ['toastMessenger'];

export default withServices(VersionInfo);
