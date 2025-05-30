import { PlusIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo, useState } from 'preact/hooks';

import type { Group } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { serviceConfig } from '../../config/service-config';
import { isThirdPartyUser } from '../../helpers/account-id';
import { orgName } from '../../helpers/group-list-item-common';
import { groupsByOrganization } from '../../helpers/group-organizations';
import { isThirdPartyService } from '../../helpers/is-third-party-service';
import { withServices } from '../../service-context';
import { useSidebarStore } from '../../store';
import Menu from '../Menu';
import MenuItem from '../MenuItem';
import GroupListSection from './GroupListSection';

/**
 * Return the custom icon for the top bar configured by the publisher in
 * the Hypothesis client configuration.
 */
function publisherProvidedIcon(settings: SidebarSettings) {
  const svc = serviceConfig(settings);
  return svc && svc.icon ? svc.icon : null;
}

export type GroupListProps = {
  settings: SidebarSettings;
};

/**
 * Menu allowing the user to select which group to show and also access
 * additional actions related to groups.
 */
function GroupList({ settings }: GroupListProps) {
  const store = useSidebarStore();
  const currentGroups = store.getCurrentlyViewingGroups();
  const featuredGroups = store.getFeaturedGroups();
  const myGroups = store.getMyGroups();
  const focusedGroup = store.focusedGroup();
  const userid = store.profile().userid;

  // Prevent changing groups during an import
  const disabled = store.importsPending() > 0;

  const myGroupsSorted = useMemo(
    () => groupsByOrganization(myGroups),
    [myGroups],
  );

  const featuredGroupsSorted = useMemo(
    () => groupsByOrganization(featuredGroups),
    [featuredGroups],
  );

  const currentGroupsSorted = useMemo(
    () => groupsByOrganization(currentGroups),
    [currentGroups],
  );

  const defaultAuthority = store.defaultAuthority();
  const canCreateNewGroup =
    userid && !isThirdPartyUser(userid, defaultAuthority);
  const newGroupLink = store.getLink('groups.new');

  // The group whose submenu is currently open, or `null` if no group item is
  // currently expanded.
  //
  // nb. If we create other menus that behave similarly in future, we may want
  // to move this state to the `Menu` component.
  const [expandedGroup, setExpandedGroup] = useState<Group | null>(null);

  let label;
  if (focusedGroup) {
    const icon =
      focusedGroup.organization.logo || publisherProvidedIcon(settings) || '';

    // If org name is missing, then treat this icon like decoration
    // and pass an empty string.
    const altName = orgName(focusedGroup) ? orgName(focusedGroup) : '';
    label = (
      <span
        className={classnames(
          // Add some vertical padding so that the dropdown has some space
          'py-1',
        )}
      >
        <span
          className={classnames(
            // Don't allow this label to shrink (wrap to next line)
            'shrink-0 flex items-center gap-x-1 text-md text-color-text font-bold',
          )}
        >
          {icon && (
            <img
              className={classnames(
                // Tiny adjustment to make H logo align better with group name
                'relative top-[1px] w-4 h-4',
              )}
              src={icon}
              alt={altName}
            />
          )}
          {focusedGroup.name}
        </span>
      </span>
    );
  } else {
    label = <span>…</span>;
  }

  const isThirdParty = isThirdPartyService(settings);

  // We don't show group type icons in the third-party context because the
  // meaning may be unclear. See https://github.com/hypothesis/support/issues/183.
  const showIcons = !isThirdParty;

  // If there is only one group and no actions available for that group,
  // just show the group name as a label.
  const actionsAvailable = !isThirdParty;
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
      contentClass="min-w-[250px]"
      disabled={disabled}
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
          showIcons={showIcons}
        />
      )}
      {featuredGroupsSorted.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          heading="Featured Groups"
          groups={featuredGroupsSorted}
          showIcons={showIcons}
        />
      )}
      {myGroupsSorted.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          heading="My Groups"
          groups={myGroupsSorted}
          showIcons={showIcons}
        />
      )}

      {canCreateNewGroup && (
        <MenuItem
          icon={PlusIcon}
          href={newGroupLink}
          label="Create new group"
        />
      )}
    </Menu>
  );
}

export default withServices(GroupList, ['settings']);
