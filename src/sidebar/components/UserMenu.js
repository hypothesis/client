import { ProfileIcon } from '@hypothesis/frontend-shared/lib/next';
import { useState } from 'preact/hooks';

import { serviceConfig } from '../config/service-config';
import {
  isThirdPartyUser,
  username as getUsername,
} from '../helpers/account-id';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';

import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * /

/**
 * @typedef UserMenuProps
 * @prop {() => void} onLogout - onClick callback for the "log out" button
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 * @prop {SidebarSettings} settings
 */

/**
 * A menu with user and account links.
 *
 * This menu will contain different items depending on service configuration,
 * context and whether the user is first- or third-party.
 *
 * @param {UserMenuProps} props
 */
function UserMenu({ frameSync, onLogout, settings }) {
  const store = useSidebarStore();
  const defaultAuthority = store.defaultAuthority();
  const profile = store.profile();

  const isThirdParty = isThirdPartyUser(profile.userid, defaultAuthority);
  const service = serviceConfig(settings);
  const username = getUsername(profile.userid);
  const displayName = profile.user_info?.display_name ?? username;
  const [isOpen, setOpen] = useState(false);

  /** @param {keyof import('../../types/config').Service} feature */
  const serviceSupports = feature => service && !!service[feature];

  const isSelectableProfile =
    !isThirdParty || serviceSupports('onProfileRequestProvided');
  const isLogoutEnabled =
    !isThirdParty || serviceSupports('onLogoutRequestProvided');

  const onSelectNotebook = () => {
    frameSync.notifyHost('openNotebook', store.focusedGroupId());
  };

  // Temporary access to the Notebook without feature flag:
  // type the key 'n' when user menu is focused/open

  /** @param {KeyboardEvent} event */
  const onKeyDown = event => {
    if (event.key === 'n') {
      onSelectNotebook();
      setOpen(false);
    }
  };

  const onProfileSelected = () =>
    isThirdParty && frameSync.notifyHost('profileRequested');

  // Generate dynamic props for the profile <MenuItem> component
  const profileItemProps = (() => {
    const props = {};
    if (isSelectableProfile) {
      if (!isThirdParty) {
        props.href = store.getLink('user', { user: username });
      }
      props.onClick = onProfileSelected;
    }
    return props;
  })();

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
            {...profileItemProps}
          />
          {!isThirdParty && (
            <MenuItem
              label="Account settings"
              href={store.getLink('account.settings')}
            />
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
