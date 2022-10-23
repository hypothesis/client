import { matchQuote } from './match-quote';
import { RangeAnchor, TextPositionAnchor, TextQuoteAnchor } from './types';

/**
 * @typedef {import('../../types/api').RangeSelector} RangeSelector
 * @typedef {import('../../types/api').Selector} Selector
 * @typedef {import('../../types/api').TextPositionSelector} TextPositionSelector
 * @typedef {import('../../types/api').TextQuoteSelector} TextQuoteSelector
 * @typedef {import('../../types/api').Context} Context
 */

/**
 * @param {RangeAnchor|TextPositionAnchor|TextQuoteAnchor} anchor
 * @param {object} [options]
 *  @param {number} [options.hint]
 */
async function querySelector(anchor, options = {}) {
  return anchor.toRange(options);
}

/**
 * Anchor a set of selectors.
 *
 * This function converts a set of selectors into a document range.
 * It encapsulates the core anchoring algorithm, using the selectors alone or
 * in combination to establish the best anchor within the document.
 *
 * @param {Element} root - The root element of the anchoring context.
 * @param {Selector[]} selectors - The selectors to try.
 * @param {object} [options]
 *   @param {number} [options.hint]
 */
export function anchor(root, selectors, options = {}) {
  let position = /** @type {TextPositionSelector|null} */ (null);
  let quote = /** @type {TextQuoteSelector|null} */ (null);
  let range = /** @type {RangeSelector|null} */ (null);

  // Collect all the selectors
  for (let selector of selectors) {
    switch (selector.type) {
      case 'TextPositionSelector':
        position = selector;
        options.hint = position.start; // TextQuoteAnchor hint
        break;
      case 'TextQuoteSelector':
        quote = selector;
        break;
      case 'RangeSelector':
        range = selector;
        break;
    }
  }

  /**
   * Assert the quote matches the stored quote, if applicable
   * @param {Range} range
   */
  const maybeAssertQuote = range => {
    if (quote?.exact && range.toString() !== quote.exact) {
      throw new Error('quote mismatch');
    } else {
      return range;
    }
  };

  // From a default of failure, we build up catch clauses to try selectors in
  // order, from simple to complex.
  /** @type {Promise<Range>} */
  let promise = Promise.reject('unable to anchor');

  if (range) {
    // Const binding assures TS that it won't be re-assigned when callback runs.
    const range_ = range;
    promise = promise.catch(() => {
      let anchor = RangeAnchor.fromSelector(root, range_);
      return querySelector(anchor, options).then(maybeAssertQuote);
    });
  }

  if (position) {
    const position_ = position;
    promise = promise.catch(() => {
      let anchor = TextPositionAnchor.fromSelector(root, position_);
      return querySelector(anchor, options).then(maybeAssertQuote);
    });
  }

  if (quote) {
    const quote_ = quote;
    promise = promise.catch(() => {
      let anchor = TextQuoteAnchor.fromSelector(root, quote_);
      return querySelector(anchor, options);
    });
  }

  return promise;
}

/**
 * @param {Element} root
 * @param {Range} range
 */
export function describe(root, range) {
  const types = [RangeAnchor, TextPositionAnchor, TextQuoteAnchor];
  const result = [];
  for (let type of types) {
    try {
      const anchor = type.fromRange(root, range);
      result.push(anchor.toSelector());
    } catch (error) {
      continue;
    }
  }
  return result;
}

/**
 * Remove spaces and line breaks from a string.
 *
 * @param {String} str
 */
function cleanUpString(str) {
  return str.replace(/\s\s+/g, ' ').replace(/[\n\r]/g, ' ');
}

/**
 * Return the sentence from which the text is quoted.
 *
 * @param {HTMLElement} root
 * @param {Range} range
 * @return {Promise<Context>}
 */
export async function provideContext(root, range) {
  const textQuoteAnchor = TextQuoteAnchor.fromRange(root, range);
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return node.textContent && /^\n*$/.test(node.textContent.trim())
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const rootTextContentInNodes = [];
  let currentNode;
  // eslint-disable-next-line no-cond-assign
  while (treeWalker.nextNode()) {
    currentNode = treeWalker.currentNode;
    if (currentNode && currentNode.textContent) {
      rootTextContentInNodes.push(cleanUpString(currentNode.textContent));
    }
  }

  const rootTextContentInString = cleanUpString(rootTextContentInNodes.join(' '));
  let match;
  const exact = cleanUpString(textQuoteAnchor.exact);
  if (textQuoteAnchor.context.prefix && textQuoteAnchor.context.suffix) {
    match = matchQuote(
      rootTextContentInString,
      exact,
      {
        prefix: cleanUpString(textQuoteAnchor.context.prefix),
        suffix: cleanUpString(textQuoteAnchor.context.suffix),
      }
    );
  }

  if (!match) {
    return {
      type: 'Context',
      prefix: '',
      quote: exact,
      suffix: ''
    };
  }

  // @ts-ignore
  const segmenter = new Intl.Segmenter('en', {granularity: "sentence"});
  const contextLen = 500;
  let prefix = rootTextContentInString.slice(Math.max(0, match.start - contextLen), match.start);
  let suffix = rootTextContentInString.slice(match.end, Math.min(rootTextContentInString.length, match.end + contextLen))

  let segments = segmenter.segment(prefix);
  for (let {segment} of segments) {
    prefix = segment
  }

  segments = segmenter.segment(suffix);
  for (let {segment} of segments) {
    suffix = segment
    break;
  }

  return {
    type: 'Context',
    prefix: prefix.trimStart(),
    quote: exact,
    suffix: suffix.trimEnd()
  }
}
