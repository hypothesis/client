import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';

import Button from './button';
import SidebarPanel from './sidebar-panel';

/**
 * @typedef LoginPromptPanelProps
 * @prop {() => any} onLogin
 * @prop {() => any} onSignUp
 */

/**
 * A sidebar panel that prompts a user to log in (or sign up) to annotate.
 *
 * @param {LoginPromptPanelProps} props
 */
export default function LoginPromptPanel({ onLogin, onSignUp }) {
  const store = useStoreProxy();
  const isLoggedIn = store.isLoggedIn();
  if (isLoggedIn) {
    return null;
  }
  return (
    <SidebarPanel
      icon="restricted"
      title="Login needed"
      panelName={uiConstants.PANEL_LOGIN_PROMPT}
    >
      <p>Please log in to create annotations or highlights.</p>
      <div className="sidebar-panel__actions">
        <Button
          buttonText="Sign up"
          className="sidebar-panel__button"
          onClick={onSignUp}
        />
        <Button
          buttonText="Log in"
          className="sidebar-panel__button--primary"
          onClick={onLogin}
        />
      </div>
    </SidebarPanel>
  );
}

LoginPromptPanel.propTypes = {
  onLogin: propTypes.func.isRequired,
  onSignUp: propTypes.func.isRequired,
};
