import { ProfileIcon } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

// Service, serviceConfig, isThirdPartyUser, getUsername are no longer needed
// import type { Service, SidebarSettings } from '../../types/config';
// import { serviceConfig } from '../config/service-config';
// import {
//   isThirdPartyUser,
//   username as getUsername,
// } from '../helpers/account-id';
import type { SidebarSettings } from '../../types/config'; // Keep SidebarSettings if settings.dashboard is used
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync'; // Keep if onSelectNotebook or onSelectProfile is used
import { useSidebarStore } from '../store';
import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';
import OpenDashboardMenuItem from './OpenDashboardMenuItem';

export type UserMenuProps = {
  // onLogout prop removed

  // Injected
  frameSync: FrameSyncService; // Keep if onSelectNotebook is used
  settings: SidebarSettings; // Keep if settings.dashboard is used
};

/**
 * A menu for the "Default_User".
 *
 * This menu is simplified for a single-user context, removing account-specific
 * actions and external links.
 */
function UserMenu({ frameSync, settings }: UserMenuProps) {
  const store = useSidebarStore();
  const profile = store.profile(); // This will be the "Default_User" profile

  // displayName will be "Default User" from the static profile
  const displayName = profile.user_info?.display_name || 'User';
  const [isOpen, setOpen] = useState(false);

  // isThirdParty, service, username, serviceSupports, isSelectableProfile,
  // logoutAvailable, logoutDisabled, onProfileSelected, profileHref are removed.

  // isProfileEnabled can be kept if 'client_user_profile' feature flag might be used
  // by "Default_User" for a local-only profile view (currently out of scope).
  // For now, assuming this feature flag will be false or the item removed.
  // const isProfileEnabled = store.isFeatureEnabled('client_user_profile');

  const onSelectNotebook = () => {
    const groupId = store.focusedGroupId();
    if (groupId) {
      frameSync.notifyHost('openNotebook', groupId);
    }
  };
  // const onSelectProfile = () => frameSync.notifyHost('openProfile'); // Removed

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'n') {
      onSelectNotebook();
      setOpen(false);
    }
    // "Your profile" (p key) shortcut removed
    // else if (isProfileEnabled && event.key === 'p') {
    //   onSelectProfile();
    //   setOpen(false);
    // }
  };

  const menuLabel = (
    <span className="p-1">
      <ProfileIcon />
    </span>
  );
  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div data-testid="user-menu" onKeyDown={onKeyDown}>
      <Menu
        label={menuLabel}
        title={displayName} // This will be "Default User"
        align="right"
        open={isOpen}
        onOpenChanged={setOpen}
      >
        <MenuSection>
          {/* Display name item - no longer a link to external profile */}
          <MenuItem label={displayName} isDisabled={true} />

          {/* "Account settings" MenuItem removed */}
          {/* "Your profile" MenuItem removed (as it implied external interaction) */}
          {/* If a local profile view is desired later, isProfileEnabled could control it */}

          <MenuItem label="Open notebook" onClick={() => onSelectNotebook()} />
        </MenuSection>
        {settings.dashboard?.showEntryPoint && (
          <MenuSection>
            <OpenDashboardMenuItem isMenuOpen={isOpen} />
          </MenuSection>
        )}
        {/* Logout section removed */}
      </Menu>
    </div>
  );
}

// frameSync might not be needed if onSelectNotebook is also removed later
export default withServices(UserMenu, ['frameSync', 'settings']);
