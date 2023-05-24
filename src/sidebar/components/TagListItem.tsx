import { Link, CancelIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

export type TagListItemProps = {
  /** If present, tag will be linked to this URL  */
  href?: string;

  /**
   * Callback for deleting this tag. If present, a delete button will be
   * rendered for the tag.
   */
  onRemoveTag?: (tag: string) => void;
  tag: string;
};

/**
 * Render a single annotation tag as part of a list of tags
 */
export default function TagListItem({
  href,
  onRemoveTag,
  tag,
}: TagListItemProps) {
  return (
    <li className="flex items-center border rounded-sm bg-grey-0">
      <div className="grow px-1.5 py-1 touch:p-2">
        {href ? (
          <Link
            variant="text-light"
            href={href}
            lang=""
            target="_blank"
            aria-label={`Tag: ${tag}`}
            title={`View annotations with tag: ${tag}`}
            underline="none"
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
            'focus-visible-ring ring-inset'
          )}
          onClick={() => {
            onRemoveTag(tag);
          }}
          title={`Remove tag: ${tag}`}
        >
          <CancelIcon className="font-base w-em h-em" title={`Remove ${tag}`} />
        </button>
      )}
    </li>
  );
}
