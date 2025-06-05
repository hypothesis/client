import type { RenderToBitmapOptions } from '../../types/annotator';
import type { FrameSyncService } from './frame-sync';

async function bitmapToImageURL(bitmap: ImageBitmap): Promise<string> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  const blob = await canvas.convertToBlob();
  return URL.createObjectURL(blob);
}

export type Thumbnail = {
  /** Thumbnail image width in pixels. */
  width: number;

  /** Thumbnail image height in pixels. */
  height: number;

  /**
   * URL for thumbnail image.
   *
   * This URL is created from a blob via {@link URL.createObjectURL} and will be
   * revoked via {@link URL.revokeObjectURL} when expired from {@link
   * ThumbnailService}'s cache.
   */
  url: string;
};

/**
 * Service for managing thumbnails for annotated sections of a document.
 *
 * @inject
 */
export class ThumbnailService {
  /** Map of annotation tag to thumbnail. */
  #cache = new Map<string, Thumbnail>();

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
      const entry = this.#cache.get(tag);
      if (entry) {
        URL.revokeObjectURL(entry.url);
      }
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
  ): Promise<Thumbnail> {
    const entry = this.get(tag);
    if (entry) {
      return entry;
    }

    const bitmap = await this.#frameSync.requestThumbnail(tag, options);
    const url = await bitmapToImageURL(bitmap);
    const thumbnail = { url, width: bitmap.width, height: bitmap.height };
    this.#cache.set(tag, thumbnail);

    if (this.#cache.size > this.cacheSize) {
      this.#pruneCache();
    }

    return thumbnail;
  }

  /**
   * Return the cached thumbnail for an annotation.
   *
   * Returns `null` if there is no cached entry, in which case
   * {@link ThumbnailService.fetch} must be called to generate and cache a new
   * thumbnail.
   */
  get(tag: string): Thumbnail | null {
    const thumbnail = this.#cache.get(tag);
    if (!thumbnail) {
      return null;
    }

    // Move this entry to the back of the cache's key list, so it becomes
    // the most recently used.
    this.#cache.delete(tag);
    this.#cache.set(tag, thumbnail);

    return thumbnail;
  }

  /**
   * Return the annotation tags associated with cached thumbnails, in
   * least-recently-used order.
   */
  cachedThumbnailTags() {
    return [...this.#cache.keys()];
  }
}
