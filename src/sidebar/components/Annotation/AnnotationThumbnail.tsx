import { IconButton, InfoIcon, Popover } from '@hypothesis/frontend-shared';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { withServices } from '../../service-context';
import type { ThumbnailService, Thumbnail } from '../../services/thumbnail';

export type AnnotationThumbnailProps = {
  tag: string;
  thumbnailService: ThumbnailService;

  /**
   * Text contained in the thumbnail.
   *
   * This is used when generating alt text for the thumbnail.
   */
  textInImage?: string;

  /** Description of the thumbnail. */
  description?: string;
};

function AnnotationThumbnail({
  description,
  textInImage,
  tag,
  thumbnailService,
}: AnnotationThumbnailProps) {
  // If a cached thumbnail is available then render it immediately, otherwise
  // we'll request one be generated.
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(() =>
    thumbnailService.get(tag),
  );
  const [error, setError] = useState<string>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const descriptionButtonRef = useRef();

  const devicePixelRatio = useMemo(() => window.devicePixelRatio, []);
  const maxWidth = 196;

  useEffect(() => {
    if (!thumbnail && !error) {
      thumbnailService
        .fetch(tag, { maxWidth: maxWidth * devicePixelRatio, devicePixelRatio })
        .then(setThumbnail)
        .catch(err => setError(err.message));
    }
  }, [error, devicePixelRatio, tag, thumbnail, thumbnailService]);

  let altText;
  if (description) {
    altText = `Thumbnail. ${description}`;
  } else if (textInImage) {
    altText = `Thumbnail. Contains text: ${textInImage}`;
  } else {
    altText = 'Thumbnail';
  }

  const scaledWidth = thumbnail ? thumbnail.width / devicePixelRatio : 0;
  const scaledHeight = thumbnail ? thumbnail.height / devicePixelRatio : 0;

  return (
    <div
      className="flex flex-row justify-center relative"
      data-testid="thumbnail-container"
    >
      {thumbnail && (
        <img
          src={thumbnail.url}
          alt={altText}
          className="border rounded-md"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        />
      )}
      {thumbnail && description && (
        <>
          <IconButton
            classes="absolute text-[white] text-[16px]"
            variant="custom"
            icon={InfoIcon}
            title="Image description"
            onClick={() => setPopoverOpen(true)}
            expanded={popoverOpen}
            elementRef={descriptionButtonRef}
            style={{
              // Position info button towards top-right corner of thumbnail.
              //
              // Conceptually we center the button on the top-right corner of
              // the thumbnail, then offset it by 16px to bring it inside the
              // thumbnail. The button size changes on touch displays, but the
              // icon size is fixed.
              left: `calc(50% + ${scaledWidth}px / 2 - 16px)`,
              top: '16px',
              transform: 'translateX(-50%) translateY(-50%)',
              // Add a drop shadow to make the white icon visible on thumbnails
              // that have a light background.
              filter: 'drop-shadow(grey 1px 1px 1px)',
            }}
          />
          <Popover
            open={popoverOpen}
            align="right"
            anchorElementRef={descriptionButtonRef}
            onClose={() => setPopoverOpen(false)}
            classes="p-2"
          >
            {description}
          </Popover>
        </>
      )}
      {!thumbnail && !error && (
        // TODO - Adjust size here so it matches the thumbnail after it has
        // finished loading.
        <span data-testid="placeholder">Loading thumbnail...</span>
      )}
      {!thumbnail && error && (
        <span data-testid="error">Unable to render thumbnail: {error}</span>
      )}
    </div>
  );
}

export default withServices(AnnotationThumbnail, ['thumbnailService']);
