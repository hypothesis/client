import { Button, Panel, RestrictedIcon } from '@hypothesis/frontend-shared';

import type { SidebarSettings } from '../../types/config';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';

export type SidebarContentErrorProps = {
  errorType: 'annotation' | 'group';

  /** Whether or not to render a "Clear selection" button */
  showClearSelection?: boolean;

  /** A function that will launch the login flow for the user */
  onLoginRequest: () => void;

  // injected
  settings: SidebarSettings;
};

/**
 * Show an error indicating that an annotation or group referenced in the URL
 * could not be fetched.
 */
function SidebarContentError({
  errorType,
  onLoginRequest,
  showClearSelection = false,
  settings: { commentsMode },
}: SidebarContentErrorProps) {
  const store = useSidebarStore();
  const isLoggedIn = store.isLoggedIn();

  const errorTitle =
    errorType === 'group'
      ? 'Group unavailable'
      : commentsMode
        ? 'Comment unavailable'
        : 'Annotation unavailable';

  const errorMessage = (() => {
    if (!isLoggedIn) {
      return `The ${errorType} associated with the current URL is unavailable.
        You may need to log in to see it.`;
    }
    if (errorType === 'group') {
      return `The current URL links to a group, but that group cannot be found,
        or you do not have permission to view the annotations in that group.`;
    }
    return `The current URL links to ${commentsMode ? 'a comment' : 'an annotation'},
     but that ${commentsMode ? 'comment' : 'annotation'} cannot be found, or you
     do not have permission to view it.`;
  })();

  return (
    <div className="mb-4">
      <Panel icon={RestrictedIcon} title={errorTitle}>
        <p>{errorMessage}</p>
        <div className="flex justify-end space-x-2">
          {showClearSelection && (
            <Button
              variant={isLoggedIn ? 'primary' : undefined}
              onClick={() => store.clearSelection()}
            >
              Show all {commentsMode ? 'comments' : 'annotations'}
            </Button>
          )}
          {!isLoggedIn && (
            <Button variant="primary" onClick={onLoginRequest}>
              Log in
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default withServices(SidebarContentError, ['settings']);
