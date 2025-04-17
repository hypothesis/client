import type { RenderToBitmapOptions } from '../../types/annotator';
import type { FrameSyncService } from './frame-sync';

/**
 * Service for managing thumbnails for annotated sections of a document.
 *
 * @inject
 */
export class ThumbnailService {
  /** Map of annotation tag to thumbnail image. */
  #cache = new Map<string, ImageBitmap>();
  #frameSync: FrameSyncService;

  constructor(frameSync: FrameSyncService) {
    this.#frameSync = frameSync;
  }

  /**
   * Request a thumbnail for an annotation.
   *
   * The annotation must have been anchored in the document before a thumbnail
   * can be fetched.
   *
   * @param tag - Tag identifying the annotation to fetch a thumbnail for
   * @return Thumbnail image
   */
  async fetch(
    tag: string,
    options: RenderToBitmapOptions = {},
  ): Promise<ImageBitmap> {
    const entry = this.#cache.get(tag);
    if (entry) {
      return entry;
    }

    // TODO - Implement a mechanism to remove old cache entries when annotations
    // are unloaded or thumbnails have been unused for long enough.

    const bitmap = await this.#frameSync.requestThumbnail(tag, options);
    this.#cache.set(tag, bitmap);
    return bitmap;
  }

  /**
   * Return the cached thumbnail for an annotation.
   *
   * Returns `null` if there is no cached entry, in which case
   * {@link ThumbnailService.fetch} must be called to generate and cache a new
   * thumbnail.
   */
  get(tag: string): ImageBitmap | null {
    return this.#cache.get(tag) ?? null;
  }
}
