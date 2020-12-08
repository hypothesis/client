import { createElement } from 'preact';
import propTypes from 'prop-types';

import bridgeEvents from '../../shared/bridge-events';
import serviceConfig from '../service-config';
import { isThirdPartyUser } from '../util/account-id';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../util/service-context';

import Menu from './menu';
import MenuItem from './menu-item';
import MenuSection from './menu-section';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * @typedef {import('../services/service-url').ServiceUrlGetter} ServiceUrlGetter
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * /

/**
 * @typedef AuthState
 * @prop {string} displayName
 * @prop {string} userid
 * @prop {string} username
 */

/**
 * @typedef UserMenuProps
 * @prop {AuthState} auth - object representing authenticated user and auth status
 * @prop {() => any} onLogout - onClick callback for the "log out" button
 * @prop {Object} bridge
 * @prop {ServiceUrlGetter} serviceUrl
 * @prop {MergedConfig} settings
 */

/**
 * A menu with user and account links.
 *
 * This menu will contain different items depending on service configuration,
 * context and whether the user is first- or third-party.
 *
 * @param {UserMenuProps} props
 */
function UserMenu({ auth, bridge, onLogout, serviceUrl, settings }) {
  const store = useStoreProxy();
  const isThirdParty = isThirdPartyUser(auth.userid, settings.authDomain);
  const service = serviceConfig(settings);
  const isNotebookEnabled = store.isFeatureEnabled('notebook_launch');

  const serviceSupports = feature => service && !!service[feature];

  const isSelectableProfile =
    !isThirdParty || serviceSupports('onProfileRequestProvided');
  const isLogoutEnabled =
    !isThirdParty || serviceSupports('onLogoutRequestProvided');

  const onSelectNotebook = () => {
    bridge.call('showNotebook', store.focusedGroupId());
  };

  const onProfileSelected = () =>
    isThirdParty && bridge.call(bridgeEvents.PROFILE_REQUESTED);

  // Generate dynamic props for the profile <MenuItem> component
  const profileItemProps = (() => {
    const props = {};
    if (isSelectableProfile) {
      if (!isThirdParty) {
        props.href = serviceUrl('user', { user: auth.username });
      }
      props.onClick = onProfileSelected;
    }
    return props;
  })();

  const menuLabel = (
    <span className="top-bar__menu-label">
      <SvgIcon name="profile" className="top-bar__menu-icon" />
    </span>
  );
  return (
    <div className="user-menu">
      <Menu label={menuLabel} title={auth.displayName} align="right">
        <MenuSection>
          <MenuItem
            label={auth.displayName}
            isDisabled={!isSelectableProfile}
            {...profileItemProps}
          />
          {!isThirdParty && (
            <MenuItem
              label="Account settings"
              href={serviceUrl('account.settings')}
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

UserMenu.propTypes = {
  auth: propTypes.object.isRequired,
  onLogout: propTypes.func.isRequired,
  bridge: propTypes.object.isRequired,
  serviceUrl: propTypes.func.isRequired,
  settings: propTypes.object.isRequired,
};

UserMenu.injectedProps = ['bridge', 'serviceUrl', 'settings'];

export default withServices(UserMenu);
