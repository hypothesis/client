import { useEffect, useMemo, useState } from 'preact/hooks';

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

  return (
    <div
      className="flex flex-row justify-center"
      data-testid="thumbnail-container"
    >
      {thumbnail && (
        <img
          src={thumbnail.url}
          alt={altText}
          title={altText}
          className="border rounded-md"
          style={{
            width: `${thumbnail.width / devicePixelRatio}px`,
            height: `${thumbnail.height / devicePixelRatio}px`,
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
  );
}

export default withServices(AnnotationThumbnail, ['thumbnailService']);
