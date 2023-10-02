import type { UserAnnotations } from '../../helpers/annotations-by-user';

export type UserAnnotationsListItemProps = {
  userAnnotations: Omit<UserAnnotations, 'userid'>;
};

/**
 * UserAnnotations representation to use inside `SelectNext.Option`.
 */
export function UserAnnotationsListItem({
  userAnnotations,
}: UserAnnotationsListItemProps) {
  return (
    <div className="flex gap-x-2">
      {userAnnotations.displayName}
      <div className="rounded px-1 bg-grey-7 text-white">
        {userAnnotations.annotations.length}
      </div>
    </div>
  );
}
