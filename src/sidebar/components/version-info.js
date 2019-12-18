'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { copyText } = require('../util/copy-to-clipboard');
const { withServices } = require('../util/service-context');

const Button = require('./button');

/**
 * Display current client version info
 */
function VersionInfo({ flash, versionData }) {
  const copyVersionData = () => {
    try {
      copyText(versionData.asFormattedString());
      flash.info('Copied version info to clipboard');
    } catch (err) {
      flash.error('Unable to copy version info');
    }
  };

  return (
    <div>
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
      <div className="version-info__actions">
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
  /**
   * Object with version information
   *
   * @type {import('../util/version-info').VersionData}
   */
  versionData: propTypes.object.isRequired,

  /** injected properties */
  flash: propTypes.object.isRequired,
};

VersionInfo.injectedProps = ['flash'];

module.exports = withServices(VersionInfo);
