import { Excerpt, StyledText } from '@hypothesis/annotation-ui';
import { useEffect, useMemo, useState, useId } from 'preact/hooks';

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

  /**
   * Description of the thumbnail, used as alt text.
   */
  description?: string;

  /**
   * Whether to show the description as visible text.
   *
   * Defaults to true. When false the description is still used as alt text.
   */
  showDescription?: boolean;
};

function AnnotationThumbnail({
  description,
  textInImage,
  tag,
  thumbnailService,
  showDescription = true,
}: AnnotationThumbnailProps) {
  // If a cached thumbnail is available then render it immediately, otherwise
  // we'll request one be generated.
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(() =>
    thumbnailService.get(tag),
  );
  const [error, setError] = useState<string>();

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
    altText = description;
  } else if (textInImage) {
    altText = textInImage;
  }

  const scaledWidth = thumbnail ? thumbnail.width / devicePixelRatio : 0;
  const scaledHeight = thumbnail ? thumbnail.height / devicePixelRatio : 0;

  const altId = useId();

  return (
    <>
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
        {!thumbnail && !error && (
          // TODO - Adjust size here so it matches the thumbnail after it has
          // finished loading.
          <span data-testid="placeholder">Loading thumbnail...</span>
        )}
        {!thumbnail && error && (
          <span data-testid="error">Unable to render thumbnail: {error}</span>
        )}
      </div>

      {thumbnail && altText && showDescription && (
        <Excerpt
          // Two lines of text
          collapsedHeight={35}
          inlineControls={true}
        >
          <StyledText
            // Hide this text from screen readers because it duplicates the thumbnail's
            // `alt` attribute, and we don't want them to read the text twice.
            aria-hidden="true"
          >
            <blockquote id={altId}>{altText}</blockquote>
          </StyledText>
        </Excerpt>
      )}
    </>
  );
}

export default withServices(AnnotationThumbnail, ['thumbnailService']);
