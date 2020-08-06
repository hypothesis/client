import { createElement } from 'preact';
import propTypes from 'prop-types';

import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../util/service-context';

import Button from './button';

/**
 * @typedef VersionInfoProps
 * @prop {import('../util/version-data').default} versionData - Object with version information
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
      <dl className="version-info">
        <dt className="version-info__key">Version</dt>
        <dd className="version-info__value">{versionData.version}</dd>
        <dt className="version-info__key">User Agent</dt>
        <dd className="version-info__value">{versionData.userAgent}</dd>
        <dt className="version-info__key">URL</dt>
        <dd className="version-info__value">{versionData.url}</dd>
        <dt className="version-info__key">Fingerprint</dt>
        <dd className="version-info__value">{versionData.fingerprint}</dd>
        <dt className="version-info__key">Account</dt>
        <dd className="version-info__value">{versionData.account}</dd>
        <dt className="version-info__key">Date</dt>
        <dd className="version-info__value">{versionData.timestamp}</dd>
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

VersionInfo.propTypes = {
  versionData: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

VersionInfo.injectedProps = ['toastMessenger'];

export default withServices(VersionInfo);
