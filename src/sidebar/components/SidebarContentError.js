import { SvgIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { useStoreProxy } from '../store/use-store';

import Button from './Button';

/**
 * @typedef SidebarContentErrorProps
 * @prop {'annotation'|'group'} errorType
 * @prop {boolean} [showClearSelection] - Whether to show a "Clear selection" button.
 * @prop {() => any} onLoginRequest - A function that will launch the login flow for the user.
 */

/**
 * Show an error indicating that an annotation or group referenced in the URL
 * could not be fetched.
 *
 * @param {SidebarContentErrorProps} props
 */
export default function SidebarContentError({
  errorType,
  onLoginRequest,
  showClearSelection = false,
}) {
  const store = useStoreProxy();
  const isLoggedIn = store.isLoggedIn();

  const errorTitle =
    errorType === 'annotation' ? 'Annotation unavailable' : 'Group unavailable';

  const errorMessage = (() => {
    if (!isLoggedIn) {
      return `The ${errorType} associated with the current URL is unavailable.
        You may need to log in to see it.`;
    }
    if (errorType === 'group') {
      return `The current URL links to a group, but that group cannot be found,
        or you do not have permission to view the annotations in that group.`;
    }
    return `The current URL links to an annotation, but that annotation
      cannot be found, or you do not have permission to view it.`;
  })();

  return (
    <div className="SidebarContentError">
      <div className="SidebarContentError__header">
        <div className="SidebarContentError__header-icon">
          <SvgIcon name="restricted" title={errorTitle} />
        </div>
        <div className="SidebarContentError__title u-stretch">{errorTitle}</div>
      </div>
      <div className="SidebarContentError__content">
        <p>{errorMessage}</p>
        <div className="SidebarContentError__actions">
          {showClearSelection && (
            <Button
              buttonText="Show all annotations"
              className={classnames({
                SidebarContentError__button: !isLoggedIn,
                'SidebarContentError__button--primary': isLoggedIn,
              })}
              onClick={() => store.clearSelection()}
            />
          )}
          {!isLoggedIn && (
            <Button
              buttonText="Log in"
              className="SidebarContentError__button--primary"
              onClick={onLoginRequest}
            />
          )}
        </div>
      </div>
    </div>
  );
}
