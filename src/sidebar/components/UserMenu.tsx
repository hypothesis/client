import { ProfileIcon } from '@hypothesis/frontend-shared/lib/next';
import { useState } from 'preact/hooks';

import type { Service, SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import {
  isThirdPartyUser,
  username as getUsername,
} from '../helpers/account-id';
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync';
import { useSidebarStore } from '../store';

import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

export type UserMenuProps = {
  onLogout: () => void;
  frameSync: FrameSyncService;
  settings: SidebarSettings;
};

/**
 * A menu with user and account links.
 *
 * This menu will contain different items depending on service configuration,
 * context and whether the user is first- or third-party.
 */
function UserMenu({ frameSync, onLogout, settings }: UserMenuProps) {
  const store = useSidebarStore();
  const defaultAuthority = store.defaultAuthority();
  const profile = store.profile();

  const isThirdParty = isThirdPartyUser(profile.userid, defaultAuthority);
  const service = serviceConfig(settings);
  const username = getUsername(profile.userid);
  const displayName = profile.user_info?.display_name ?? username;
  const [isOpen, setOpen] = useState(false);

  const serviceSupports = (feature: keyof Service) =>
    service && !!service[feature];

  const isSelectableProfile =
    !isThirdParty || serviceSupports('onProfileRequestProvided');
  const isLogoutEnabled =
    !isThirdParty || serviceSupports('onLogoutRequestProvided');
  const isProfileEnabled = store.isFeatureEnabled('client_user_profile');

  const onSelectNotebook = () => {
    frameSync.notifyHost('openNotebook', store.focusedGroupId());
  };
  const onSelectProfile = () => frameSync.notifyHost('openProfile');

  // Access to the Notebook:
  // type the key 'n' when user menu is focused/open
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'n') {
      onSelectNotebook();
      setOpen(false);
    } else if (isProfileEnabled && event.key === 'p') {
      onSelectProfile();
      setOpen(false);
    }
  };

  const onProfileSelected = () =>
    isThirdParty && frameSync.notifyHost('profileRequested');
  const profileHref =
    isSelectableProfile && !isThirdParty
      ? store.getLink('user', { user: username })
      : undefined;

  const menuLabel = (
    <span className="p-1">
      <ProfileIcon />
    </span>
  );
  return (
    // Allow keyboard shortcut 'n' to open Notebook
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div data-testid="user-menu" onKeyDown={onKeyDown}>
      <Menu
        label={menuLabel}
        title={displayName}
        align="right"
        open={isOpen}
        onOpenChanged={setOpen}
      >
        <MenuSection>
          <MenuItem
            label={displayName}
            isDisabled={!isSelectableProfile}
            href={profileHref}
            onClick={isSelectableProfile ? onProfileSelected : undefined}
          />
          {!isThirdParty && (
            <MenuItem
              label="Account settings"
              href={store.getLink('account.settings')}
            />
          )}
          {isProfileEnabled && (
            <MenuItem label="Your profile" onClick={() => onSelectProfile()} />
          )}
          <MenuItem label="Open notebook" onClick={() => onSelectNotebook()} />
        </MenuSection>
        {isLogoutEnabled && (
          <MenuSection>
            <MenuItem label="Log out" onClick={onLogout} />
          </MenuSection>
        )}
      </Menu>
    </div>
  );
}

export default withServices(UserMenu, ['frameSync', 'settings']);
