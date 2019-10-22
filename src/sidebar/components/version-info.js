'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

/**
 * Display current client version info
 */
function VersionInfo({ versionData }) {
  return (
    <dl className="version-info">
      <dt className="version-info__key">Version</dt>
      <dd className="version-info__value">{versionData.version}</dd>
      <dt className="version-info__key">User Agent</dt>
      <dd className="version-info__value">{versionData.userAgent}</dd>
      <dt className="version-info__key">URL</dt>
      <dd className="version-info__value">{versionData.url}</dd>
      <dt className="version-info__key">Fingerprint</dt>
      <dd className="version-info__value">{versionData.fingerprint}</dd>
      <dt className="version-info__key">Username</dt>
      <dd className="version-info__value">{versionData.username}</dd>
      <dt className="version-info__key">Date</dt>
      <dd className="version-info__value">{versionData.timestamp}</dd>
    </dl>
  );
}

VersionInfo.propTypes = {
  /* Object with version information */
  versionData: propTypes.object.isRequired,
};

module.exports = VersionInfo;
