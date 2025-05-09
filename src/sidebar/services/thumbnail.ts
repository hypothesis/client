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

  /** Max thumbnails to keep in cache. */
  #cacheSize = 30;

  #frameSync: FrameSyncService;

  constructor(frameSync: FrameSyncService) {
    this.#frameSync = frameSync;
  }

  /** Return the number of thumbnails that are cached. */
  get cacheSize() {
    return this.#cacheSize;
  }

  /** Set the number of thumbnails that are cached. */
  set cacheSize(size: number) {
    this.#cacheSize = size;
    this.#pruneCache();
  }

  #pruneCache() {
    // Keys are visited in insertion order, so the least recently used entry
    // will be visited first.
    for (const tag of this.#cache.keys()) {
      this.#cache.delete(tag);
      if (this.#cache.size <= this.cacheSize) {
        break;
      }
    }
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
    const entry = this.get(tag);
    if (entry) {
      return entry;
    }

    const bitmap = await this.#frameSync.requestThumbnail(tag, options);
    this.#cache.set(tag, bitmap);

    if (this.#cache.size > this.cacheSize) {
      this.#pruneCache();
    }

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
    const bitmap = this.#cache.get(tag);
    if (!bitmap) {
      return null;
    }

    // Move this entry to the back of the cache's key list, so it becomes
    // the most recently used.
    this.#cache.delete(tag);
    this.#cache.set(tag, bitmap);

    return bitmap;
  }

  /**
   * Return the annotation tags associated with cached thumbnails, in
   * least-recently-used order.
   */
  cachedThumbnailTags() {
    return [...this.#cache.keys()];
  }
}
