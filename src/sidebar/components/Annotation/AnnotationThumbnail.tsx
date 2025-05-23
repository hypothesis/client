import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { withServices } from '../../service-context';
import type { ThumbnailService } from '../../services/thumbnail';

type BitmapImageProps = {
  alt: string;
  bitmap: ImageBitmap;
  classes?: string;
  scale?: number;
};

/** An `<img>`-like component which renders an {@link ImageBitmap}. */
function BitmapImage({ alt, bitmap, classes, scale = 1.0 }: BitmapImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  }, [bitmap]);

  return (
    <canvas
      ref={canvasRef}
      width={bitmap.width}
      height={bitmap.height}
      role="img"
      // The `alt` attribute on an `<img>` maps to aria-label. We might want to
      // split this into a separate concise label and longer description in
      // future.
      aria-label={alt}
      // Set the title attribute to make it easy to inspect the alt text on
      // desktop. Screen readers will only read `aria-label` since it has the
      // same value.
      title={alt}
      className={classes}
      style={{
        width: `${bitmap.width / scale}px`,
        height: `${bitmap.height / scale}px`,
      }}
    />
  );
}

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
  const [thumbnail, setThumbnail] = useState<ImageBitmap | null>(() =>
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
        <BitmapImage
          alt={altText}
          bitmap={thumbnail}
          classes="border rounded-md"
          scale={devicePixelRatio}
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
