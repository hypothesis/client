import { Link, LinkButton, Icon } from '@hypothesis/frontend-shared';

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
          classes="inline text-color-text underline hover:underline"
          href={store.getLink('signup')}
          target="_blank"
        >
          create a free account
        </Link>{' '}
        or{' '}
        <LinkButton classes="inline underline" onClick={onLogin} variant="dark">
          log in
        </LinkButton>
        .
      </span>
      <div>
        <Link
          href="https://hypothes.is"
          aria-label="Hypothesis homepage"
          target="_blank"
          title="Hypothesis homepage"
        >
          <Icon name="logo" classes="w-16 h-16 text-grey-7" />
        </Link>
      </div>
    </div>
  );
}

export default LoggedOutMessage;
