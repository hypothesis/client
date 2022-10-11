import { LinkBase } from '@hypothesis/frontend-shared/lib/next';

/**
 * @typedef AnnotationUserProps
 * @prop {string} [authorLink]
 * @prop {string} displayName
 */

/**
 * Display information about an annotation's user. Link to the user's
 * activity if `authorLink` is present.
 *
 * @param {AnnotationUserProps} props
 */
function AnnotationUser({ authorLink, displayName }) {
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
