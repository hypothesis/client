import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';

import Button from './button';
import SvgIcon from './svg-icon';

/**
 * An error message to display in the sidebar.
 */
export default function SidebarContentError({ errorType, onLoginRequest }) {
  const clearSelection = useStore(store => store.clearSelection);
  const isLoggedIn = useStore(store => store.isLoggedIn());

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
    <div className="sidebar-content-error">
      <div className="sidebar-content-error__header">
        <div className="sidebar-content-error__header-icon">
          <SvgIcon name="restricted" title={errorTitle} />
        </div>
        <div className="sidebar-content-error__title u-stretch">
          {errorTitle}
        </div>
      </div>
      <div className="sidebar-content-error__content">
        <p>{errorMessage}</p>
        <div className="sidebar-content-error__actions">
          <Button
            buttonText="Show all annotations"
            className="sidebar-content-error__button"
            onClick={clearSelection}
            usePrimaryStyle={isLoggedIn}
          />
          {!isLoggedIn && (
            <Button
              buttonText="Log in"
              className="sidebar-content-error__button"
              onClick={onLoginRequest}
              usePrimaryStyle
            />
          )}
        </div>
      </div>
    </div>
  );
}

SidebarContentError.propTypes = {
  errorType: propTypes.oneOf(['annotation', 'group']),
  /* A function that will launch the login flow for the user. */
  onLoginRequest: propTypes.func.isRequired,
};
