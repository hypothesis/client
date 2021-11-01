import { Icon, Link } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../../store/use-store';
import { isPrivate } from '../../helpers/permissions';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationShareInfoProps
 * @prop {Annotation} annotation
 */

/**
 * Render information about what group an annotation is in and
 * whether it is private to the current user (only me)
 *
 * @param {AnnotationShareInfoProps} props
 */
function AnnotationShareInfo({ annotation }) {
  const store = useStoreProxy();
  const group = store.getGroup(annotation.group);

  // Only show the name of the group and link to it if there is a
  // URL (link) returned by the API for this group. Some groups do not have links
  const linkToGroup = group?.links.html;

  const annotationIsPrivate = isPrivate(annotation.permissions);

  return (
    <div className="hyp-u-layout-row--align-baseline">
      {group && linkToGroup && (
        <Link
          classes="hyp-u-layout-row--align-baseline hyp-u-horizontal-spacing--2 p-link--muted p-link--hover-muted"
          href={group.links.html}
          target="_blank"
        >
          {group.type === 'open' ? (
            <Icon classes="u-icon--xsmall" name="public" />
          ) : (
            <Icon classes="u-icon--xsmall" name="groups" />
          )}
          <span>{group.name}</span>
        </Link>
      )}
      {annotationIsPrivate && !linkToGroup && (
        <span className="hyp-u-layout-row--align-baseline u-color-text--muted">
          <span data-testid="private-info">Only me</span>
        </span>
      )}
    </div>
  );
}

export default AnnotationShareInfo;
