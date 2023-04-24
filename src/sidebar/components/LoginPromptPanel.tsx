import {
  Button,
  CardActions,
  RestrictedIcon,
} from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../store';
import SidebarPanel from './SidebarPanel';

export type LoginPromptPanelProps = {
  onLogin: () => void;
  onSignUp: () => void;
};

/**
 * A sidebar panel that prompts a user to log in (or sign up) to annotate.
 */
export default function LoginPromptPanel({
  onLogin,
  onSignUp,
}: LoginPromptPanelProps) {
  const store = useSidebarStore();
  const isLoggedIn = store.isLoggedIn();
  if (isLoggedIn) {
    return null;
  }
  return (
    <SidebarPanel
      icon={RestrictedIcon}
      title="Login needed"
      panelName="loginPrompt"
    >
      <p>Please log in to create annotations or highlights.</p>
      <CardActions>
        <Button title="Sign up" onClick={onSignUp}>
          Sign up
        </Button>
        <Button title="Log in" variant="primary" onClick={onLogin}>
          Log in
        </Button>
      </CardActions>
    </SidebarPanel>
  );
}
