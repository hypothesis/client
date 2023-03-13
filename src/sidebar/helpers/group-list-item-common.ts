import type { Group } from '../../types/api';

export function orgName(group: Group): string {
  return group.organization && group.organization.name;
}
