import { LinkBase } from '@hypothesis/frontend-shared/lib/next';

type AnnotationUserProps = {
  authorLink?: string;
  displayName: string;
};

/**
 * Display information about an annotation's user. Link to the user's
 * activity if `authorLink` is present.
 */
function AnnotationUser({ authorLink, displayName }: AnnotationUserProps) {
  const user = <h3 className="text-color-text font-bold">{displayName}</h3>;

  if (authorLink) {
    return (
      <LinkBase href={authorLink} target="_blank">
        {user}
      </LinkBase>
    );
  }

  return <div>{user}</div>;
}

export default AnnotationUser;
