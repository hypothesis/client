import { Icon, Link } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

/**
 * @typedef TagListItemProps
 * @prop {string} [href] - If present, tag will be linked to this URL
 * @prop {(tag: string) => void} [onRemoveTag] - Callback for deleting a tag. If
 *   present, a delete button will be provided for the tag
 * @prop {string} tag
 */

/**
 * Render a single annotation tag as part of a list of tags
 *
 * @param {TagListItemProps} props
 */
export default function TagListItem({ href, onRemoveTag, tag }) {
  return (
    <li className="flex items-center border rounded-sm bg-grey-0">
      <div className="grow px-1.5 py-1 touch:p-2">
        {href ? (
          <Link
            classes="text-color-text-light hover:text-brand"
            href={href}
            lang=""
            target="_blank"
            aria-label={`Tag: ${tag}`}
            title={`View annotations with tag: ${tag}`}
          >
            {tag}
          </Link>
        ) : (
          <span
            className="text-color-text-light cursor-default"
            aria-label={`Tag: ${tag}`}
            lang=""
          >
            {tag}
          </span>
        )}
      </div>
      {onRemoveTag && (
        <button
          className={classnames(
            // More padding for mobile users to make touch target larger
            'px-1.5 py-1 touch:p-2',
            // Rounded border to match container edges and make keyboard focus
            // ring shape conform. Turn off left side
            // border radius to maintain a straight dividing line
            'border-l rounded-sm rounded-l-none',
            'text-grey-6 hover:text-color-text hover:bg-grey-2',
            // Emulates transitions on *Button shared component styling
            'transition-colors duration-200',
            'hyp-u-outline-on-keyboard-focus--inset'
          )}
          onClick={() => {
            onRemoveTag(tag);
          }}
          title={`Remove tag: ${tag}`}
        >
          <Icon classes="font-base" name="cancel" title={`Remove ${tag}`} />
        </button>
      )}
    </li>
  );
}
