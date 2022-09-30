import {
  Link,
  LinkBase,
  LinkButton,
  LogoIcon,
} from '@hypothesis/frontend-shared/lib/next';

import { useSidebarStore } from '../store';

/**
 * @typedef LoggedOutMessageProps
 * @prop {() => void} onLogin
 */

/**
 * Render a call-to-action to log in or sign up. This message is intended to be
 * displayed to non-auth'd users when viewing a single annotation in a
 * direct-linked context (i.e. URL with syntax `/#annotations:<annotation_id>`)
 *
 * @param {LoggedOutMessageProps} props
 */
function LoggedOutMessage({ onLogin }) {
  const store = useSidebarStore();

  return (
    <div className="flex flex-col items-center m-6 space-y-6">
      <span className="text-center">
        This is a public annotation created with Hypothesis. <br />
        To reply or make your own annotations on this document,{' '}
        <Link
          color="text"
          href={store.getLink('signup')}
          target="_blank"
          underline="always"
        >
          create a free account
        </Link>{' '}
        or{' '}
        <LinkButton inline color="text" onClick={onLogin} underline="always">
          log in
        </LinkButton>
        .
      </span>
      <div>
        <LinkBase
          href="https://hypothes.is"
          aria-label="Hypothesis homepage"
          target="_blank"
          title="Hypothesis homepage"
        >
          <LogoIcon className="w-16 h-16 text-grey-7" />
        </LinkBase>
      </div>
    </div>
  );
}

export default LoggedOutMessage;
