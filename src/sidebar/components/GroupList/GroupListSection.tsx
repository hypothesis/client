import type { Group } from '../../../types/api';
import MenuSection from '../MenuSection';
import GroupListItem from './GroupListItem';

export type GroupListSectionProps = {
  /** The group whose submenu is currently expanded. */
  expandedGroup?: Group | null;

  /** List of groups to be displayed in the section. */
  groups: Group[];

  /** Heading displayed at top of section. */
  heading?: string;

  /**
   * Callback invoked when a group is expanded or collapsed.
   *
   * Set to either the group that is being expanded or `null` if the group given
   * by {@link GroupListSectionProps.expandedGroup} is being collapsed.
   */
  onExpandGroup: (group: Group | null) => void;
};

/**
 * A labeled section of the groups list.
 */
export default function GroupListSection({
  expandedGroup,
  onExpandGroup,
  groups,
  heading,
}: GroupListSectionProps) {
  return (
    <MenuSection heading={heading}>
      {groups.map(group => (
        <GroupListItem
          key={group.id}
          isExpanded={group === expandedGroup}
          onExpand={expanded => onExpandGroup(expanded ? group : null)}
          group={group}
        />
      ))}
    </MenuSection>
  );
}
