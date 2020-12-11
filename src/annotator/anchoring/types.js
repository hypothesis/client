/**
 * This module exports a set of classes for converting between DOM `Range`
 * objects and different types of selectors. It is mostly a thin wrapper around a
 * set of anchoring libraries. It serves two main purposes:
 *
 *  1. Providing a consistent interface across different types of anchors.
 *  2. Insulating the rest of the code from API changes in the underlying anchoring
 *     libraries.
 */

import { SerializedRange, sniff } from './range';
import { TextRange } from './text-range';
import { matchQuote } from './match-quote';

/**
 * @typedef {import("./range").BrowserRange} BrowserRange}
 * @typedef {import("./range").NormalizedRange} NormalizedRange}
 * @typedef {Range|BrowserRange|NormalizedRange|SerializedRange} AnyRangeType
 *
 * @typedef {import('../../types/api').RangeSelector} RangeSelector
 * @typedef {import('../../types/api').TextPositionSelector} TextPositionSelector
 * @typedef {import('../../types/api').TextQuoteSelector} TextQuoteSelector
 *
 * @typedef TextContentNode
 * @prop {string} textContent
 */

/**
 * Converts between `RangeSelector` selectors and `Range` objects.
 */
export class RangeAnchor {
  /**
   * @param {Node} root - A root element from which to anchor.
   * @param {AnyRangeType} range -  A range describing the anchor.
   */
  constructor(root, range) {
    this.root = root;
    this.range = sniff(range).normalize(this.root);
  }

  /**
   * @param {Node} root -  A root element from which to anchor.
   * @param {AnyRangeType} range -  A range describing the anchor.
   */
  static fromRange(root, range) {
    return new RangeAnchor(root, range);
  }

  /**
   * Create an anchor from a serialized `RangeSelector` selector.
   *
   * @param {Node} root -  A root element from which to anchor.
   * @param {RangeSelector} selector
   */
  static fromSelector(root, selector) {
    const data = {
      start: selector.startContainer,
      startOffset: selector.startOffset,
      end: selector.endContainer,
      endOffset: selector.endOffset,
    };
    const range = new SerializedRange(data);
    return new RangeAnchor(root, range);
  }

  toRange() {
    return this.range.toRange();
  }

  /**
   * @return {RangeSelector}
   */
  toSelector() {
    const range = this.range.serialize(this.root);
    return {
      type: 'RangeSelector',
      startContainer: range.start,
      startOffset: range.startOffset,
      endContainer: range.end,
      endOffset: range.endOffset,
    };
  }
}

/**
 * Converts between `TextPositionSelector` selectors and `Range` objects.
 */
export class TextPositionAnchor {
  /**
   * @param {Element} root
   * @param {number} start
   * @param {number} end
   */
  constructor(root, start, end) {
    this.root = root;
    this.start = start;
    this.end = end;
  }

  /**
   * @param {Element} root
   * @param {Range} range
   */
  static fromRange(root, range) {
    const textRange = TextRange.fromRange(range).relativeTo(root);
    return new TextPositionAnchor(
      root,
      textRange.start.offset,
      textRange.end.offset
    );
  }
  /**
   * @param {Element} root
   * @param {TextPositionSelector} selector
   */
  static fromSelector(root, selector) {
    return new TextPositionAnchor(root, selector.start, selector.end);
  }

  /**
   * @return {TextPositionSelector}
   */
  toSelector() {
    return {
      type: 'TextPositionSelector',
      start: this.start,
      end: this.end,
    };
  }

  toRange() {
    return TextRange.fromOffsets(this.root, this.start, this.end).toRange();
  }
}

/**
 * @typedef QuoteMatchOptions
 * @prop {number} [hint] - Expected position of match in text. See `matchQuote`.
 */

/**
 * Converts between `TextQuoteSelector` selectors and `Range` objects.
 */
export class TextQuoteAnchor {
  /**
   * @param {Element} root - A root element from which to anchor.
   * @param {string} exact
   * @param {Object} context
   *   @param {string} [context.prefix]
   *   @param {string} [context.suffix]
   */
  constructor(root, exact, context = {}) {
    this.root = root;
    this.exact = exact;
    this.context = context;
  }

  /**
   * Create a `TextQuoteAnchor` from a range.
   *
   * Will throw if `range` does not contain any text nodes.
   *
   * @param {Element} root
   * @param {Range} range
   */
  static fromRange(root, range) {
    const text = /** @type {string} */ (root.textContent);
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

  /**
   * @param {Element} root
   * @param {TextQuoteSelector} selector
   */
  static fromSelector(root, selector) {
    const { prefix, suffix } = selector;
    return new TextQuoteAnchor(root, selector.exact, { prefix, suffix });
  }

  /**
   * @return {TextQuoteSelector}
   */
  toSelector() {
    return {
      type: 'TextQuoteSelector',
      exact: this.exact,
      prefix: this.context.prefix,
      suffix: this.context.suffix,
    };
  }

  /**
   * @param {QuoteMatchOptions} [options]
   */
  toRange(options = {}) {
    return this.toPositionAnchor(options).toRange();
  }

  /**
   * @param {QuoteMatchOptions} [options]
   */
  toPositionAnchor(options = {}) {
    const text = /** @type {string} */ (this.root.textContent);
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
