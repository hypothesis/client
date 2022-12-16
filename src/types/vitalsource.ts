/**
 * This module defines the types exposed by the VitalSource Bookshelf reader
 * to our JavaScript code running in the viewer.
 *
 * The primary entry point is the `<mosaic-book>` custom element in the container
 * frame, whose API is described by {@link MosaicBookElement}.
 */

/**
 * Book metadata exposed by the VitalSource viewer.
 */
export type BookInfo = {
  /**
   * Indicates the book type. "epub" means the book was created from an EPUB
   * and the content is XHTML. "pbk" means the book was created from a PDF and
   * has a fixed layout.
   */
  format: 'epub' | 'pbk';

  /**
   * VitalSource book ID ("vbid"). This identifier is _usually_ the book's
   * ISBN, hence the field name. However this value is not always a valid ISBN.
   */
  isbn: string;
  title: string;
};

/**
 * Metadata about a segment of a VitalSource book.
 *
 * Some VS APIs refer to a segment as a "page" (see
 * {@link MosaicBookElement.getCurrentPage} but the amount of content in
 * a segment depends on the book type and publisher. In a PDF-based book,
 * each segment corresponds to a single page of a PDF. In an EPUB-based book,
 * a segment is a single "Content Document" within the EPUB. This typically
 * corresponds to one chapter of the book, but it could be more or less
 * granular.
 */
export type PageInfo = {
  /**
   * Path of the resource within the book that contains the segment's resources.
   *
   * eg. In an EPUB a content document might have a URL such as
   * "https://jigsaw.vitalsource.com/books/1234/epub/OEBPS/html/chapter06.html". The corresponding
   * `absoluteURL` entry would be "/books/1234/epub/OEBPS/html/chapter06.html".
   */
  absoluteURL: string;

  /**
   * Identifies the entry in the EPUB's table of contents that corresponds to
   * this page/segment.
   *
   * See https://idpf.org/epub/linking/cfi/#sec-path-res.
   *
   * For PDF-based books, VitalSource creates a synthetic CFI which is the page
   * index, eg. "/1" for the second page.
   */
  cfi: string;

  /**
   * The page label for the first page of the segment. This is the page number
   * that is displayed in the VitalSource navigation controls when the
   * chapter is scrolled to the top.
   */
  page: string;

  /**
   * Index of the current segment within the sequence of pages or content
   * documents that make up the book.
   */
  index: number;

  /**
   * Title of the entry in the table of contents that refers to the current
   * segment. For PDF-based books, a chapter will often have multiple pages
   * and all these pages will have the same title. In EPUBs, each content
   * document will typically have a different title.
   *
   * WARNING: This information may be incorrect in some books. See
   * https://github.com/hypothesis/client/issues/4986. Data from
   * {@link MosaicBookElement.getTOC} can be used instead.
   */
  chapterTitle: string;
};

/**
 * An entry from a book's table of contents. This information comes from
 * an EPUB's Navigation Document [1] or Navigation Control File ("toc.ncx") [2].
 *
 * [1] https://www.w3.org/publishing/epub3/epub-packages.html#sec-package-nav
 * [2] https://www.niso.org/publications/ansiniso-z3986-2005-r2012-specifications-digital-talking-book
 *
 * An example entry looks like this:
 *
 * ```
 * {
 *   "title": "acknowledgments",
 *   "path": "/OEBPS/Text/fm.htm#heading_id_4",
 *   "level": 2,
 *   "cfi": "/6/14[;vnd.vst.idref=fm.htm]!/4/20[heading_id_4]",
 *   "page": "9",
 * }
 * ```
 */
export type TableOfContentsEntry = {
  /** The title of the book segment that this entry refers to. */
  title: string;

  /**
   * The path of the EPUB Content Document containing the location that this
   * TOC entry points to.
   */
  path: string;

  /**
   * The 1-based level of the entry in the table of contents tree.
   */
  level: number;

  /**
   * Canonical Fragment Identifier specifying the location within the book that
   * this TOC entry points to.
   */
  cfi: string;

  /** The page label associated with this location in the book. */
  page: string;
};

/**
 * A type that represents a successful data fetch or an error.
 *
 * This is a container type used in the return types of various
 * {@link MosaicBookElement} methods.
 */
export type DataResponse<T> = {
  /** True if the data was fetched successfully. */
  ok: boolean;

  /** Fetched data. Will be missing if `ok` is false. */
  data?: T;

  /** HTTP status code. May be `undefined` if `ok` is false. */
  status: number | undefined;
};

/**
 * `<mosaic-book>` custom element in the VitalSource container frame.
 *
 * This element is part of the VitalSource viewer. It contains the book content
 * inside a frame within its Shadow DOM, and also has methods that can be used
 * to fetch book metadata, get the current location and navigate the book.
 */
export type MosaicBookElement = HTMLElement & {
  /** Returns metadata about the currently loaded book. */
  getBookInfo(): BookInfo;

  /**
   * Returns metadata about the current page (in a PDF-based book) or
   * chapter/segment (in an EPUB-based book).
   */
  getCurrentPage(): Promise<PageInfo>;

  /** Retrieve the book's table of contents. */
  getTOC(): Promise<DataResponse<TableOfContentsEntry[]>>;

  /**
   * Navigate the book to the page or content document whose CFI matches `cfi`.
   */
  goToCfi(cfi: string): void;

  /**
   * Navigate the book to the page or content document whose URL matches `url`.
   *
   * `url` must be a relative URL with an absolute path (eg. "/books/123/chapter01.xhtml").
   */
  goToURL(url: string): void;
};
