import type { Annotation } from '../../types/api';
import type { Facet } from '../util/search-filter';
import * as unicodeUtils from '../util/unicode';
import { quote } from './annotation-metadata';

type Filter = {
  matches: (ann: Annotation) => boolean;
};

/**
 * A Matcher specifies how to test whether an annotation matches a query term
 * for a specific field.
 */
type Matcher<T = string> = {
  /** Extract the field values to be matched against a query term */
  fieldValues: (ann: Annotation) => T[];

  /**
   * Test whether a query term matches a field value. Both value and term will
   * have been normalized using `normalize`.
   */
  matches: (value: T, term: T) => boolean;

  /** Normalize a parsed term or field value for comparison */
  normalize: (val: T) => T;
};

/**
 * Normalize a string query term or field value.
 */
function normalizeStr(val: string): string {
  return unicodeUtils.fold(unicodeUtils.normalize(val)).toLowerCase();
}

/**
 * Filter that matches annotations against a single query term.
 */
class TermFilter<TermType extends string> implements Filter {
  term: TermType;
  matcher: Matcher<TermType>;

  constructor(term: TermType, matcher: Matcher<TermType>) {
    this.term = matcher.normalize(term);
    this.matcher = matcher;
  }

  /**
   * Return true if an annotation matches this filter.
   */
  matches(ann: Annotation): boolean {
    const matcher = this.matcher;
    return matcher
      .fieldValues(ann)
      .some(value => matcher.matches(matcher.normalize(value), this.term));
  }
}

/**
 * Filter that combines other filters using AND or OR combinators.
 */
class BooleanOpFilter implements Filter {
  operator: 'and' | 'or';
  filters: Filter[];

  /**
   * @param op - Boolean operator
   * @param filters - Array of filters to test against
   */
  constructor(op: 'and' | 'or', filters: Filter[]) {
    this.operator = op;
    this.filters = filters;
  }

  /**
   * Return true if an annotation matches this filter.
   */
  matches(ann: Annotation): boolean {
    if (this.operator === 'and') {
      return this.filters.every(filter => filter.matches(ann));
    } else {
      return this.filters.some(filter => filter.matches(ann));
    }
  }
}

/**
 * Create a matcher that tests whether a query term appears anywhere in a
 * string field value.
 */
function stringFieldMatcher(
  fieldValues: (ann: Annotation) => string[],
): Matcher {
  return {
    fieldValues,
    matches: (value, term) => value.includes(term),
    normalize: normalizeStr,
  };
}

/**
 * Map of field name (from a parsed query) to matcher for that field.
 */
const fieldMatchers: Record<string, Matcher | Matcher<number>> = {
  quote: stringFieldMatcher(ann => [quote(ann) ?? '']),

  since: {
    fieldValues: ann => [new Date(ann.updated).valueOf()],
    matches: (updatedTime: number, age: number) => {
      const delta = (Date.now() - updatedTime) / 1000;
      return delta <= age;
    },
    normalize: (timestamp: number) => timestamp,
  },

  tag: stringFieldMatcher(ann => ann.tags),
  text: stringFieldMatcher(ann => [ann.text]),
  uri: stringFieldMatcher(ann => [ann.uri]),
  user: stringFieldMatcher(ann => [
    ann.user,
    ann.user_info?.display_name ?? '',
  ]),
};

/**
 * Filter a set of annotations against a parsed query.
 *
 * @return IDs of matching annotations.
 */
export function filterAnnotations(
  annotations: Annotation[],
  filters: Record<string, Facet>,
): string[] {
  const makeTermFilter = <TermType>(field: string, term: TermType) =>
    new TermFilter(
      term,
      // Suppress error about potential mismatch of query term type
      // and what the matcher expects. We assume these match up.
      fieldMatchers[field] as Matcher<any>,
    );

  // Convert the input filter object into a filter tree, expanding "any"
  // filters.
  const fieldFilters = Object.entries(filters)
    .filter(([, filter]) => filter.terms.length > 0)
    .map(([field, filter]) => {
      let termFilters;
      if (field === 'any') {
        const anyFields = ['quote', 'text', 'tag', 'user'];
        termFilters = filter.terms.map(
          term =>
            new BooleanOpFilter(
              'or',
              anyFields.map(field => makeTermFilter(field, term)),
            ),
        );
      } else {
        termFilters = filter.terms.map(term => makeTermFilter(field, term));
      }
      return new BooleanOpFilter(filter.operator, termFilters);
    });

  const rootFilter = new BooleanOpFilter('and', fieldFilters);

  return annotations
    .filter(ann => {
      return ann.id && rootFilter.matches(ann);
    })
    .map(ann => ann.id!);
}
