import {
  Input,
  IconButton,
  InfoIcon,
  Link,
  Popover,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useState, useRef } from 'preact/hooks';

export type ThumbnailDescriptionInputProps = {
  description: string;
  onEdit: (description: string) => void;
};

export default function ThumbnailDescriptionInput({
  description,
  onEdit,
}: ThumbnailDescriptionInputProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const iconRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative">
      <div className="flex gap-1 items-center">
        <Input
          data-testid="description"
          placeholder="Thumbnail description"
          aria-label="Thumbnail description"
          value={description}
          onInput={e => onEdit((e.target as HTMLInputElement).value)}
          // Maximum length for `target.description` field supported by the API.
          maxlength={250}
          classes="flex-1"
        />
        <IconButton
          icon={InfoIcon}
          title="About thumbnail descriptions"
          onClick={() => setPopoverOpen(!popoverOpen)}
          expanded={popoverOpen}
          elementRef={iconRef}
          // The icon uses `w-em` for sizing, so this sets the size. Chosen to
          // match icons in the AnnotationActionBar.
          classes="text-[16px]"
        />
      </div>
      <Popover
        open={popoverOpen}
        align="right"
        anchorElementRef={iconRef}
        onClose={() => setPopoverOpen(false)}
        classes={classnames(
          // Small gap to create separation between input and
          // popover.
          'mt-1',
          // Align popover towards right side of card.
          'w-80 max-w-[100vw]',
          'p-2 text-sm',
        )}
      >
        <div className="flex flex-col gap-y-2">
          Description of the thumbnail image used for accessibility, search and
          export to text formats.
          <Link
            href="https://web.hypothes.is/help/how-to-write-alt-text/"
            underline="always"
            target="_blank"
          >
            Learn how to write alt text
          </Link>
        </div>
      </Popover>
    </div>
  );
}
