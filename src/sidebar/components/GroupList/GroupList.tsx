// PlusIcon is no longer needed
import classnames from 'classnames';
import { useMemo, useState } from 'preact/hooks';

import type { Group } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
// serviceConfig, isThirdPartyUser, isThirdPartyService are no longer needed
// import { serviceConfig } from '../../config/service-config';
// import { isThirdPartyUser } from '../../helpers/account-id';
import { orgName } from '../../helpers/group-list-item-common';
import { groupsByOrganization } from '../../helpers/group-organizations';
// import { isThirdPartyService } from '../../helpers/is-third-party-service';
import { withServices } from '../../service-context';
import { useSidebarStore } from '../../store';
import Menu from '../Menu';
// MenuItem is still needed for individual group items if not using GroupListSection for a flat list
import MenuItem from '../MenuItem';
import GroupListSection from './GroupListSection'; // Keep if using sections by organization

/**
 * Return the custom icon for the top bar configured by the publisher in
 * the Hypothesis client configuration.
 * This function might be simplified or removed if publisher-specific icons are not used.
 */
function publisherProvidedIcon(settings: SidebarSettings) {
  // serviceConfig is removed, so this needs to be simplified or removed.
  // For now, assume it's not used for Default_User.
  // const svc = serviceConfig(settings);
  // return svc && svc.icon ? svc.icon : null;
  return null; // Simplified: No publisher icon for Default_User
}

export type GroupListProps = {
  settings: SidebarSettings;
};

/**
 * Menu allowing "Default_User" to select which group to show.
 * Simplified for a single-user context with a predefined list of groups.
 */
function GroupList({ settings }: GroupListProps) {
  const store = useSidebarStore();
  // Use allGroups or filteredGroups, as distinctions like my/featured/current are gone.
  // Assuming filteredGroups is still relevant for potential future local filtering.
  const allUserGroups = store.filteredGroups();
  const focusedGroup = store.focusedGroup();
  // userid is "Default_User", not directly used for group creation here.

  // Prevent changing groups during an import (if imports are still possible)
  const disabled = store.importsPending() > 0;

  // Sort all groups by organization for display
  const groupsSortedByOrg = useMemo(
    () => groupsByOrganization(allUserGroups),
    [allUserGroups],
  );

  // canCreateNewGroup and newGroupLink removed.
  // const defaultAuthority = store.defaultAuthority();
  // const canCreateNewGroup =
  //   userid && !isThirdPartyUser(userid, defaultAuthority);
  // const newGroupLink = store.getLink('groups.new');

  const [expandedGroup, setExpandedGroup] = useState<Group | null>(null);

  let label;
  if (focusedGroup) {
    const icon =
      focusedGroup.organization?.logo || publisherProvidedIcon(settings) || '';
    const altName = orgName(focusedGroup) ? orgName(focusedGroup) : '';
    label = (
      <span className="py-1">
        <span className="shrink-0 flex items-center gap-x-1 text-md text-color-text font-bold">
          {icon && (
            <img
              className="relative top-[1px] w-4 h-4"
              src={icon}
              alt={altName}
            />
          )}
          {focusedGroup.name}
        </span>
      </span>
    );
  } else {
    label = <span>…</span>; // Or "Select Group" as a default label
  }

  // isThirdParty checks removed. showIcons is now always true (or based on a new default).
  const showIcons = true; // Simplified: always show icons for Default_User

  // Simplified condition: if only one group, don't show a dropdown if not needed.
  // However, with predefined groups, there will likely be more than one.
  // The original `actionsAvailable` logic is removed.
  if (allUserGroups.length < 2 && !disabled) {
    // If only one group and no actions (like import pending), just show label.
    // This might need adjustment based on how "disabled" should behave.
    // For simplicity, we might always render the Menu if there's at least one group.
  }

  const menuTitle = 'Select Group'; // Simplified title

  return (
    <Menu
      align="left"
      contentClass="min-w-[250px]"
      disabled={disabled}
      label={label}
      onOpenChanged={() => setExpandedGroup(null)}
      title={menuTitle}
    >
      {/* 
        Render a single section for all groups, or iterate through groupsSortedByOrg 
        if maintaining organization sections.
        For now, using GroupListSection for consistency if sorting by org is kept.
        If a flat list is preferred, this would be a map of `groupsSortedByOrg` (or `allUserGroups`)
        to `MenuItem` components.
      */}
      {groupsSortedByOrg.length > 0 && (
        <GroupListSection
          expandedGroup={expandedGroup}
          onExpandGroup={setExpandedGroup}
          // No specific heading like "My Groups" needed, or use a generic one.
          // heading="Available Groups" 
          groups={groupsSortedByOrg}
          showIcons={showIcons}
        />
      )}
      {/* "Create new group" MenuItem removed */}
    </Menu>
  );
}

export default withServices(GroupList, ['settings']);
