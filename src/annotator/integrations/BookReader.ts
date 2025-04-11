import debounce from 'lodash.debounce';
import { TinyEmitter } from 'tiny-emitter';

import type { BookReader } from '../../types/BookReader';
import type {
  Anchor,
  AnnotationData,
  AnnotationTool,
  Annotator,
  Integration,
  SidebarLayout,
} from '../../types/annotator';
import { PageSelector, Selector } from '../../types/api';
import { anchor, canDescribe, describe } from '../anchoring/BookReader';
import { TextRange } from '../anchoring/text-range';

/**
 * Window with additional globals set by BookReader.
 */
type BRWindow = Window & { br: BookReader };

/**
 * Is the current document the BookReader viewer application?
 */
export function isBookReader() {
  const windowMaybeWithBR: Window & { br?: BookReader } = window;
  return typeof windowMaybeWithBR.br !== 'undefined';
}

/**
 * Integration that works with PDF.js
 */
export class BookReaderIntegration extends TinyEmitter implements Integration {
  private _annotator: Annotator;
  private _br: BookReader;
  private _debouncedUpdate: () => void;

  constructor(annotator: Annotator) {
    super();

    this._annotator = annotator;

    const brWindow = window as unknown as BRWindow;
    this._br = brWindow.br;

    this._debouncedUpdate = debounce(this._update, 100, {
      leading: false,
      trailing: true,
    });

    // Listen for page changes to re-anchor annotations.
    this._br.on('fragmentChange', this._debouncedUpdate);
  }

  destroy() {
    this._br.off('fragmentChange', this._debouncedUpdate);
  }

  /**
   * Return the URL of the currently loaded book.
   */
  async uri() {
    return this._br.options.bookUri;
  }

  /**
   * Return the metadata (eg. title) for the currently loaded book.
   */
  async getMetadata() {
    const uri = await this.uri();
    return {
      title: this._br.options.bookTitle,
      link: [{ href: uri }],
      documentFingerprint: uri,
    };
  }

  /**
   * Resolve serialized `selectors` from an annotation to a range.
   */
  anchor(root: HTMLElement, selectors: Selector[]): Promise<Range> {
    return anchor(root, selectors);
  }

  /**
   * Trim `range` to remove leading or trailing empty content, then check to see
   * if that trimmed Range lies within a single page's text layer. If so,
   * return the trimmed Range.
   */
  getAnnotatableRange(range: Range) {
    try {
      const trimmedRange = TextRange.trimmedRange(range);
      if (canDescribe(trimmedRange)) {
        return trimmedRange;
      }
    } catch (err) {
      if (!(err instanceof RangeError)) {
        throw err;
      }
    }
    return null;
  }

  /* istanbul ignore next */
  canStyleClusteredHighlights() {
    return true;
  }

  /**
   * Generate selectors for the text in `range`.
   */
  describe(root: HTMLElement, range: Range): Promise<Selector[]> {
    return describe(root, range);
  }

  fitSideBySide(layout: SidebarLayout): boolean {
    return false;
  }

  // This method (re-)anchors annotations when pages are rendered and destroyed.
  _update = async () => {
    const refreshAnnotations: AnnotationData[] = [];

    // For pages that are no longer visible, we want to
    // remove the highlights from the DOM
    for (const anchor of this._annotator.anchors) {
      if (!anchor.highlights?.length) {
        // The highlights are not rendered yet
        // For pages that are now visible, we want to re-anchor
        // the annotations
        refreshAnnotations.push(anchor.annotation);
        continue;
      }

      const placeholder = anchor.highlights[0].closest(
        '.BRannotationPlaceholder',
      );
      // If it's a placeholder and its page is now visible, we want to re-anchor
      if (placeholder) {
        const pageSelector = anchor.target.selector?.find(
          s => s.type === 'PageSelector',
        ) as PageSelector;
        if (!pageSelector) {
          throw new Error('No page selector found');
        }

        const pageContainer = this._br.refs.$br.find(
          `.BRpagecontainer[data-index="${pageSelector.index}"]`,
        );
        if (pageContainer.length) {
          delete anchor.region;
          placeholder.remove();
          anchor.highlights.splice(0, anchor.highlights.length);
          refreshAnnotations.push(anchor.annotation);
          continue;
        } else {
          // leave as placeholder
          continue;
        }
      }

      // Now it's not a placeholder; if it's page has been removed, then we need to re-anchor (potentially creating a placeholder)
      const notInDom = anchor.highlights.some(
        highlight => !document.body.contains(highlight),
      );
      if (notInDom) {
        delete anchor.region;
        // Un-annotate
        anchor.highlights.forEach(hl => hl.replaceWith(...hl.childNodes));
        anchor.highlights.splice(0, anchor.highlights.length);
        refreshAnnotations.push(anchor.annotation);
      }
    }

    for (const annotation of refreshAnnotations) {
      this._annotator.anchor(annotation);
    }
  };

  /**
   * Return the scrollable element which contains the document content.
   */
  contentContainer(): HTMLElement {
    return this._br.refs.$br.find('.BRcontainer')?.[0] as HTMLElement;
  }

  sideBySideActive() {
    return false;
  }

  supportedTools(): AnnotationTool[] {
    return ['selection'];
  }

  /**
   * Scroll to the location of an anchor in the book.
   *
   * If the anchor refers to a location that is an un-rendered page far from
   * the viewport, then scrolling happens in three phases. First the document
   * scrolls to the approximate location indicated by the placeholder anchor.
   * This triggers an `_update`, which will remove the placeholder and
   * re-anchor the annotation.
   */
  async scrollToAnchor(anchor: Anchor) {
    const pageSelector = anchor.target.selector?.find(
      s => s.type === 'PageSelector',
    ) as PageSelector;
    if (!pageSelector) {
      throw new Error('No page selector found');
    }

    if (this._br.activeMode.name == 'thumb') {
      this._br.switchMode('2up', { suppressFragmentChange: true });
      await delay(50);
    }
    this._br.jumpToIndex(pageSelector.index);

    // navigation will trigger the _update method to be called, so done here!
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
