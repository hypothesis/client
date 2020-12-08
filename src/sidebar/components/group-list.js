import { createElement } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import serviceConfig from '../service-config';
import { useStoreProxy } from '../store/use-store';
import { isThirdPartyUser } from '../util/account-id';
import { orgName } from '../util/group-list-item-common';
import groupsByOrganization from '../util/group-organizations';
import isThirdPartyService from '../util/is-third-party-service';
import { withServices } from '../util/service-context';

import GroupListSection from './group-list-section';
import Menu from './menu';
import MenuItem from './menu-item';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * @typedef {import('../../types/api').Group} Group
 * @typedef {import('../services/service-url').ServiceUrlGetter} ServiceUrlGetter
 */

/**
 * Return the custom icon for the top bar configured by the publisher in
 * the Hypothesis client configuration.
 */
function publisherProvidedIcon(settings) {
  const svc = serviceConfig(settings);
  return svc && svc.icon ? svc.icon : null;
}

/**
 * @typedef GroupListProps
 * @prop {ServiceUrlGetter} serviceUrl
 * @prop {MergedConfig} settings
 */

/**
 * Menu allowing the user to select which group to show and also access
 * additional actions related to groups.
 *
 * @param {GroupListProps} props
 */
function GroupList({ serviceUrl, settings }) {
  const store = useStoreProxy();
  const currentGroups = store.getCurrentlyViewingGroups();
  const featuredGroups = store.getFeaturedGroups();
  const myGroups = store.getMyGroups();
  const focusedGroup = store.focusedGroup();
  const userid = store.profile().userid;

  const myGroupsSorted = useMemo(() => groupsByOrganization(myGroups), [
    myGroups,
  ]);

  const featuredGroupsSorted = useMemo(
    () => groupsByOrganization(featuredGroups),
    [featuredGroups]
  );

  const currentGroupsSorted = useMemo(
    () => groupsByOrganization(currentGroups),
    [currentGroups]
  );

  const { authDomain } = settings;
  const canCreateNewGroup = userid && !isThirdPartyUser(userid, authDomain);
  const newGroupLink = serviceUrl('groups.new');

  // The group whose submenu is currently open, or `null` if no group item is
  // currently expanded.
  //
  // nb. If we create other menus that behave similarly in future, we may want
  // to move this state to the `Menu` component.
  const [expandedGroup, setExpandedGroup] = useState(
    /** @type {Group|null} */ (null)
  );

  let label;
  if (focusedGroup) {
    const icon =
      focusedGroup.organization.logo || publisherProvidedIcon(settings) || '';

    // If org name is missing, then treat this icon like decoration
    // and pass an empty string.
    const altName = orgName(focusedGroup) ? orgName(focusedGroup) : '';
    label = (
      <span className="group-list__menu-label">
        {icon && (
          <img className="group-list__menu-icon" src={icon} alt={altName} />
        )}
        {focusedGroup.name}
      </span>
    );
  } else {
    label = <span>…</span>;
  }

  // If there is only one group and no actions available for that group,
  // just show the group name as a label.
  const actionsAvailable = !isThirdPartyService(settings);
  if (
    !actionsAvailable &&
    currentGroups.length + featuredGroups.length + myGroups.length < 2
  ) {
    return label;
  }

  const menuTitle = focusedGroup
    ? `Select group (now viewing: ${focusedGroup.name})`
    : 'Select group';

  return (
    <Menu
      align="left"
      contentClass="group-list__content"
      label={label}
      onOpenChanged={() => setExpandedGroup(null)}
      title={menuTitle}
    >
      {currentGroupsSorted.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          heading="Currently Viewing"
          groups={currentGroupsSorted}
        />
      )}
      {featuredGroupsSorted.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          heading="Featured Groups"
          groups={featuredGroupsSorted}
        />
      )}
      {myGroupsSorted.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          heading="My Groups"
          groups={myGroupsSorted}
        />
      )}

      {canCreateNewGroup && (
        <MenuItem icon="add" href={newGroupLink} label="New private group" />
      )}
    </Menu>
  );
}

GroupList.propTypes = {
  serviceUrl: propTypes.func,
  settings: propTypes.object,
};

GroupList.injectedProps = ['serviceUrl', 'settings'];

export default withServices(GroupList);
