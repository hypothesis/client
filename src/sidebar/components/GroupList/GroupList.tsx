import { PlusIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { RefObject } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

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

type GroupNameProps = {
  group: Group;
  settings: SidebarSettings;

  /** Reference to the menu button element that contains this component */
  menuButtonRef: RefObject<HTMLButtonElement | undefined>;
};

function GroupName({ group, settings, menuButtonRef }: GroupNameProps) {
  const [showIcon, setShowIcon] = useState(true);
  const icon =
    showIcon &&
    (group.organization.logo || publisherProvidedIcon(settings) || '');
  const altName = orgName(group);

  // Hide the icon when there's little space for the group name.
  //
  // We could hide the icon conditionally, when it causes the name to be truncated,
  // but if hiding the icon stops truncating the name, it would enter an endless
  // loop of hiding/showing the icon, so we just stick with a minimum size after
  // which the icon is unconditionally hidden.
  useEffect(() => {
    const menuButtonEl = menuButtonRef?.current;
    /* istanbul ignore next */
    if (!menuButtonEl) {
      return () => {};
    }

    const observer = new ResizeObserver(() => {
      setShowIcon(menuButtonEl.clientWidth >= 200);
    });
    observer.observe(menuButtonEl);

    return () => observer.disconnect();
  });

  return (
    <>
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
      <span
        className={classnames(
          'text-md text-color-text font-bold truncate',
          // Add some vertical padding so that the dropdown has some space
          'py-1',
        )}
      >
        {group.name}
      </span>
    </>
  );
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
  const menuButtonRef = useRef<HTMLButtonElement | undefined>(undefined);

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

  const label = focusedGroup ? (
    <GroupName
      group={focusedGroup}
      settings={settings}
      menuButtonRef={menuButtonRef}
    />
  ) : (
    <span>…</span>
  );

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
      buttonRef={menuButtonRef}
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
