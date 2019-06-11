'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const bridgeEvents = require('../../shared/bridge-events');
const { isThirdPartyUser } = require('../util/account-id');
const serviceConfig = require('../service-config');
const { withServices } = require('../util/service-context');

const Menu = require('./menu');
const MenuSection = require('./menu-section');
const MenuItem = require('./menu-item');

/**
 * A menu with user and account links.
 *
 * This menu will contain different items depending on service configuration,
 * context and whether the user is first- or third-party.
 */
function UserMenu({ auth, bridge, onLogout, serviceUrl, settings }) {
  const isThirdParty = isThirdPartyUser(auth.userid, settings.authDomain);
  const service = serviceConfig(settings);

  const serviceSupports = feature => service && !!service[feature];

  const isSelectableProfile =
    !isThirdParty || serviceSupports('onProfileRequestProvided');
  const isLogoutEnabled =
    !isThirdParty || serviceSupports('onLogoutRequestProvided');

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

  const menuLabel = <i className="h-icon-account top-bar__btn" />;
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
  /* object representing authenticated user and auth status */
  auth: propTypes.object.isRequired,
  /* onClick callback for the "log out" button */
  onLogout: propTypes.func.isRequired,

  /* services */
  bridge: propTypes.object.isRequired,
  serviceUrl: propTypes.func.isRequired,
  settings: propTypes.object.isRequired,
};

UserMenu.injectedProps = ['bridge', 'serviceUrl', 'settings'];

module.exports = withServices(UserMenu);
