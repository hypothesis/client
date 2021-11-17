import { LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../service-context';

/**
 * @typedef VersionInfoProps
 * @prop {import('../helpers/version-data').default} versionData - Object with version information
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * @typedef VersionEntryProps
 * @prop {boolean} [breakAll=false] - Should this entry break long strings of
 *   text, even if they are mid-word? (This prevents long strings from breaking
 *   layout but may cause awkward breaks in shorter text)
 * @prop {string} field
 * @prop {string} value
 */

/**
 * Render an entry for one piece of version data.
 *
 * @param {VersionEntryProps} props
 */
function VersionEntry({ breakAll = false, field, value }) {
  return (
    <>
      <dt className="font-medium col-span-1 justify-self-end">{field}</dt>
      <dd
        className={classnames('col-span-3 text-grey-6 ', {
          'break-all': breakAll,
        })}
      >
        {value}
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
      <dl className="grid grid-cols-4 gap-y-1 gap-x-2">
        <VersionEntry field="Version" value={versionData.version} />
        <VersionEntry field="User Agent" value={versionData.userAgent} />
        <VersionEntry field="URL" value={versionData.urls} breakAll />
        <VersionEntry field="Fingerprint" value={versionData.fingerprint} />
        <VersionEntry field="Account" value={versionData.account} />
        <VersionEntry field="Date" value={versionData.timestamp} />
      </dl>
      <div className="flex flex-col items-center">
        <LabeledButton onClick={copyVersionData} icon="copy">
          Copy version details
        </LabeledButton>
      </div>
    </div>
  );
}

export default withServices(VersionInfo, ['toastMessenger']);
