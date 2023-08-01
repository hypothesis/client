import { Button, CopyIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';

import type { VersionData } from '../helpers/version-data';
import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { copyText } from '../util/copy-to-clipboard';

type VersionInfoItemProps = {
  label: string;
  children: ComponentChildren;
  classes?: string;
};

function VersionInfoItem({ label, children, classes }: VersionInfoItemProps) {
  return (
    <>
      <dt className="col-span-1 sm:text-right font-medium">{label}</dt>
      <dd
        className={classnames(
          'col-span-1 sm:col-span-3 text-color-text-light break-words',
          classes,
        )}
      >
        {children}
      </dd>
    </>
  );
}

export type VersionInfoProps = {
  versionData: VersionData;

  // injected
  toastMessenger: ToastMessengerService;
};

function VersionInfo({ toastMessenger, versionData }: VersionInfoProps) {
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
            'break-all',
          )}
          label="URL"
        >
          {versionData.urls}
        </VersionInfoItem>
        <VersionInfoItem label="Fingerprint">
          {versionData.fingerprint}
        </VersionInfoItem>
        {versionData.segment && (
          <VersionInfoItem label="Segment">
            {versionData.segment}
          </VersionInfoItem>
        )}
        <VersionInfoItem label="Account">{versionData.account}</VersionInfoItem>
        <VersionInfoItem label="Date">{versionData.timestamp}</VersionInfoItem>
      </dl>
      <div className="flex items-center justify-center">
        <Button onClick={copyVersionData} icon={CopyIcon}>
          Copy version details
        </Button>
      </div>
    </div>
  );
}

export default withServices(VersionInfo, ['toastMessenger']);
