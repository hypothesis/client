import type {
  MediaTimeSelector,
  RangeSelector,
  Selector,
  TextPositionSelector,
  TextQuoteSelector,
} from '../../types/api';
import {
  MediaTimeAnchor,
  RangeAnchor,
  TextPositionAnchor,
  TextQuoteAnchor,
} from './types';

type Options = {
  hint?: number;
};

async function querySelector(
  anchor: MediaTimeAnchor | RangeAnchor | TextPositionAnchor | TextQuoteAnchor,
  options: Options
) {
  return anchor.toRange(options);
}

/**
 * Anchor a set of selectors.
 *
 * This function converts a set of selectors into a document range.
 * It encapsulates the core anchoring algorithm, using the selectors alone or
 * in combination to establish the best anchor within the document.
 *
 * @param root - The root element of the anchoring context
 * @param selectors - The selectors to try
 */
export function anchor(
  root: Element,
  selectors: Selector[],
  options: Options = {}
) {
  let mediaTime: MediaTimeSelector | null = null;
  let position: TextPositionSelector | null = null;
  let quote: TextQuoteSelector | null = null;
  let range: RangeSelector | null = null;

  // Collect all the selectors
  for (const selector of selectors) {
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
      case 'MediaTimeSelector':
        mediaTime = selector;
        break;
    }
  }

  /**
   * Assert the quote matches the stored quote, if applicable
   */
  const maybeAssertQuote = (range: Range) => {
    if (quote?.exact && range.toString() !== quote.exact) {
      throw new Error('quote mismatch');
    } else {
      return range;
    }
  };

  // From a default of failure, we build up catch clauses to try selectors in
  // order, from simple to complex.
  let promise: Promise<Range> = Promise.reject('unable to anchor');

  if (range) {
    // Const binding assures TS that it won't be re-assigned when callback runs.
    const range_ = range;
    promise = promise.catch(() => {
      const anchor = RangeAnchor.fromSelector(root, range_);
      return querySelector(anchor, options).then(maybeAssertQuote);
    });
  }

  if (position) {
    const position_ = position;
    promise = promise.catch(() => {
      const anchor = TextPositionAnchor.fromSelector(root, position_);
      return querySelector(anchor, options).then(maybeAssertQuote);
    });
  }

  if (quote) {
    const quote_ = quote;
    promise = promise.catch(() => {
      const anchor = TextQuoteAnchor.fromSelector(root, quote_);
      return querySelector(anchor, options);
    });
  }

  if (mediaTime) {
    const mediaTime_ = mediaTime;
    promise = promise.catch(() =>
      MediaTimeAnchor.fromSelector(root, mediaTime_).toRange()
    );
  }

  return promise;
}

export function describe(root: Element, range: Range) {
  const types = [
    MediaTimeAnchor,
    RangeAnchor,
    TextPositionAnchor,
    TextQuoteAnchor,
  ];
  const result = [];
  for (const type of types) {
    try {
      const anchor = type.fromRange(root, range);
      if (anchor) {
        result.push(anchor.toSelector());
      }
    } catch (error) {
      // If resolving some anchor fails, we just want to skip it silently
    }
  }
  return result;
}
