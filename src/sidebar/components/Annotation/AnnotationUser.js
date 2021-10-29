import { Link } from '@hypothesis/frontend-shared';

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
  const user = <h3 className="u-color-text u-font--bold">{displayName}</h3>;

  if (authorLink) {
    return (
      <Link href={authorLink} target="_blank">
        {user}
      </Link>
    );
  }

  return <div>{user}</div>;
}

export default AnnotationUser;
