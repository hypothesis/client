import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardTitle,
  RestrictedIcon,
} from '@hypothesis/frontend-shared';

import type { SidebarSettings } from '../../types/config';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';
import SidebarPanel from './SidebarPanel';

export type LoginPromptPanelProps = {
  onLogin: () => void;
  onSignUp: () => void;

  // injected
  settings?: SidebarSettings;
};

/**
 * A sidebar panel that prompts a user to log in (or sign up) to annotate.
 */
function LoginPromptPanel({
  onLogin,
  onSignUp,
  settings,
}: LoginPromptPanelProps) {
  const store = useSidebarStore();
  const isLoggedIn = store.isLoggedIn();
  if (isLoggedIn) {
    return null;
  }
  return (
    <SidebarPanel label="Login panel" panelName="loginPrompt">
      <Card>
        <CardHeader>
          <RestrictedIcon className="w-em h-em" />
          <CardTitle>Login needed</CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="main-text">
            Please log in to{' '}
            {settings?.commentsMode
              ? 'write a comment'
              : 'create annotations or highlights'}
            .
          </p>
          <CardActions>
            <Button title="Sign up" onClick={onSignUp}>
              Sign up
            </Button>
            <Button title="Log in" variant="primary" onClick={onLogin}>
              Log in
            </Button>
          </CardActions>
        </CardContent>
      </Card>
    </SidebarPanel>
  );
}

export default withServices(LoginPromptPanel, ['settings']);
