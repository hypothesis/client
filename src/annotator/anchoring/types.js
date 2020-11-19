/**
 * This module exports a set of classes for converting between DOM `Range`
 * objects and different types of selectors. It is mostly a thin wrapper around a
 * set of anchoring libraries. It serves two main purposes:
 *
 *  1. Providing a consistent interface across different types of anchors.
 *  2. Insulating the rest of the code from API changes in the underlying anchoring
 *     libraries.
 */

import {
  fromRange as quoteFromRange,
  toRange as quoteToRange,
  toTextPosition,
} from 'dom-anchor-text-quote';

import { SerializedRange, sniff } from './range';
import { TextRange } from './text-range';

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
   * @param {Element} root
   * @param {Range} range
   */
  static fromRange(root, range) {
    const selector = quoteFromRange(root, range);
    return TextQuoteAnchor.fromSelector(root, selector);
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
   * @param {Object} [options]
   *   @param {number} [options.hint] -
   *     Offset hint to disambiguate matches
   *     https://github.com/tilgovi/dom-anchor-text-quote#totextpositionroot-selector-options
   */
  toRange(options = {}) {
    const range = quoteToRange(this.root, this.toSelector(), options);
    if (range === null) {
      throw new Error('Quote not found');
    }
    return range;
  }

  /**
   * @param {Object} [options]
   *   @param {number} [options.hint] -
   *     Offset hint to disambiguate matches
   *     https://github.com/tilgovi/dom-anchor-text-quote#totextpositionroot-selector-options
   */
  toPositionAnchor(options = {}) {
    const anchor = toTextPosition(this.root, this.toSelector(), options);
    if (anchor === null) {
      throw new Error('Quote not found');
    }
    return new TextPositionAnchor(this.root, anchor.start, anchor.end);
  }
}
