/**
 * This module exports a set of classes for converting between DOM `Range`
 * objects and different types of selectors. It is mostly a thin wrapper around a
 * set of anchoring libraries. It serves two main purposes:
 *
 *  1. Providing a consistent interface across different types of anchors.
 *  2. Insulating the rest of the code from API changes in the underlying anchoring
 *     libraries.
 */
import type {
  RangeSelector,
  TextPositionSelector,
  TextQuoteSelector,
} from '../../types/api';
import { matchQuote } from './match-quote';
import { TextRange, TextPosition } from './text-range';
import { nodeFromXPath, xpathFromNode } from './xpath';

/**
 * Converts between `RangeSelector` selectors and `Range` objects.
 */
export class RangeAnchor {
  root: Node;
  range: Range;

  /**
   * @param root - A root element from which to anchor.
   * @param range - A range describing the anchor.
   */
  constructor(root: Node, range: Range) {
    this.root = root;
    this.range = range;
  }

  /**
   * @param root - A root element from which to anchor.
   * @param range - A range describing the anchor.
   */
  static fromRange(root: Node, range: Range): RangeAnchor {
    return new RangeAnchor(root, range);
  }

  /**
   * Create an anchor from a serialized `RangeSelector` selector.
   *
   * @param root - A root element from which to anchor.
   */
  static fromSelector(root: Element, selector: RangeSelector): RangeAnchor {
    const startContainer = nodeFromXPath(selector.startContainer, root);
    if (!startContainer) {
      throw new Error('Failed to resolve startContainer XPath');
    }

    const endContainer = nodeFromXPath(selector.endContainer, root);
    if (!endContainer) {
      throw new Error('Failed to resolve endContainer XPath');
    }

    const startPos = TextPosition.fromCharOffset(
      startContainer,
      selector.startOffset
    );
    const endPos = TextPosition.fromCharOffset(
      endContainer,
      selector.endOffset
    );

    const range = new TextRange(startPos, endPos).toRange();
    return new RangeAnchor(root, range);
  }

  toRange(): Range {
    return this.range;
  }

  toSelector(): RangeSelector {
    // "Shrink" the range so that it tightly wraps its text. This ensures more
    // predictable output for a given text selection.
    const normalizedRange = TextRange.fromRange(this.range).toRange();

    const textRange = TextRange.fromRange(normalizedRange);
    const startContainer = xpathFromNode(textRange.start.element, this.root);
    const endContainer = xpathFromNode(textRange.end.element, this.root);

    return {
      type: 'RangeSelector',
      startContainer,
      startOffset: textRange.start.offset,
      endContainer,
      endOffset: textRange.end.offset,
    };
  }
}

/**
 * Converts between `TextPositionSelector` selectors and `Range` objects.
 */
export class TextPositionAnchor {
  root: Element;
  start: number;
  end: number;

  constructor(root: Element, start: number, end: number) {
    this.root = root;
    this.start = start;
    this.end = end;
  }

  static fromRange(root: Element, range: Range): TextPositionAnchor {
    const textRange = TextRange.fromRange(range).relativeTo(root);
    return new TextPositionAnchor(
      root,
      textRange.start.offset,
      textRange.end.offset
    );
  }

  static fromSelector(
    root: Element,
    selector: TextPositionSelector
  ): TextPositionAnchor {
    return new TextPositionAnchor(root, selector.start, selector.end);
  }

  toSelector(): TextPositionSelector {
    return {
      type: 'TextPositionSelector',
      start: this.start,
      end: this.end,
    };
  }

  toRange(): Range {
    return TextRange.fromOffsets(this.root, this.start, this.end).toRange();
  }
}

type QuoteMatchOptions = {
  /** Expected position of match in text. See `matchQuote`. */
  hint?: number;
};

export type TextQuoteAnchorContext = {
  prefix?: string;
  suffix?: string;
};

/**
 * Converts between `TextQuoteSelector` selectors and `Range` objects.
 */
export class TextQuoteAnchor {
  root: Element;
  exact: string;
  context: TextQuoteAnchorContext;

  /**
   * @param root - A root element from which to anchor.
   */
  constructor(
    root: Element,
    exact: string,
    context: TextQuoteAnchorContext = {}
  ) {
    this.root = root;
    this.exact = exact;
    this.context = context;
  }

  /**
   * Create a `TextQuoteAnchor` from a range.
   *
   * Will throw if `range` does not contain any text nodes.
   */
  static fromRange(root: Element, range: Range): TextQuoteAnchor {
    const text = root.textContent!;
    const textRange = TextRange.fromRange(range).relativeTo(root);

    const start = textRange.start.offset;
    const end = textRange.end.offset;

    // Number of characters around the quote to capture as context. We currently
    // always use a fixed amount, but it would be better if this code was aware
    // of logical boundaries in the document (paragraph, article etc.) to avoid
    // capturing text unrelated to the quote.
    //
    // In regular prose the ideal content would often be the surrounding sentence.
    // This is a natural unit of meaning which enables displaying quotes in
    // context even when the document is not available. We could use `Intl.Segmenter`
    // for this when available.
    const contextLen = 32;

    return new TextQuoteAnchor(root, text.slice(start, end), {
      prefix: text.slice(Math.max(0, start - contextLen), start),
      suffix: text.slice(end, Math.min(text.length, end + contextLen)),
    });
  }

  static fromSelector(
    root: Element,
    selector: TextQuoteSelector
  ): TextQuoteAnchor {
    const { prefix, suffix } = selector;
    return new TextQuoteAnchor(root, selector.exact, { prefix, suffix });
  }

  toSelector(): TextQuoteSelector {
    return {
      type: 'TextQuoteSelector',
      exact: this.exact,
      prefix: this.context.prefix,
      suffix: this.context.suffix,
    };
  }

  toRange(options: QuoteMatchOptions = {}): Range {
    return this.toPositionAnchor(options).toRange();
  }

  toPositionAnchor(options: QuoteMatchOptions = {}): TextPositionAnchor {
    const text = this.root.textContent!;
    const match = matchQuote(text, this.exact, {
      ...this.context,
      hint: options.hint,
    });
    if (!match) {
      throw new Error('Quote not found');
    }
    return new TextPositionAnchor(this.root, match.start, match.end);
  }
}
