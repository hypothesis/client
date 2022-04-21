import { Icon } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import { serviceConfig } from '../config/service-config';
import { isThirdPartyUser } from '../helpers/account-id';
import { withServices } from '../service-context';
import { useStoreProxy } from '../store/use-store';

import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * /

/**
 * @typedef AuthStateLoggedIn
 * @prop {'logged-in'} status
 * @prop {string} displayName
 * @prop {string} userid
 * @prop {string} username
 * @typedef {{status: 'logged-out'|'unknown'} | AuthStateLoggedIn}  AuthState
 */

/**
 * @typedef UserMenuProps
 * @prop {AuthStateLoggedIn} auth - object representing authenticated user and auth status
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
function UserMenu({ auth, frameSync, onLogout, settings }) {
  const store = useStoreProxy();
  const defaultAuthority = store.defaultAuthority();

  const isThirdParty = isThirdPartyUser(auth.userid, defaultAuthority);
  const service = serviceConfig(settings);
  const isNotebookEnabled = store.isFeatureEnabled('notebook_launch');
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
        props.href = store.getLink('user', { user: auth.username });
      }
      props.onClick = onProfileSelected;
    }
    return props;
  })();

  const menuLabel = (
    <span className="p-1">
      <Icon name="profile" />
    </span>
  );
  return (
    // FIXME: KeyDown handling is temporary for Notebook "easter egg"
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div className="UserMenu" onKeyDown={onKeyDown}>
      <Menu
        label={menuLabel}
        title={auth.displayName}
        align="right"
        open={isOpen}
        onOpenChanged={setOpen}
      >
        <MenuSection>
          <MenuItem
            label={auth.displayName}
            isDisabled={!isSelectableProfile}
            {...profileItemProps}
          />
          {!isThirdParty && (
            <MenuItem
              label="Account settings"
              href={store.getLink('account.settings')}
            />
          )}
          {isNotebookEnabled && (
            <MenuItem
              label="Open notebook"
              onClick={() => onSelectNotebook()}
            />
          )}
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
