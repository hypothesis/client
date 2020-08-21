/**
 * Tools for applying search filters against annotations.
 *
 * When the user enters a query in the search box, the query is parsed using
 * `generateFacetedFilter` and the currently loaded annotations are then matched
 * against the parsed query by the `filter` method of this class. Annotations
 * which do not match the filter are then hidden.
 */

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 */

import { quote } from './annotation-metadata';
import * as unicodeUtils from './unicode';

/**
 * @typedef Filter
 * @prop {(ann: Annotation) => boolean} matches
 */

/**
 * @typedef Checker
 * @prop {(ann: Annotation) => boolean} autofalse
 * @prop {(ann: Annotation) => any|any[]} value
 * @prop {(term: any, value: any) => boolean} match
 */

function displayName(ann) {
  if (!ann.user_info) {
    return '';
  }
  return ann.user_info.display_name || '';
}

/**
 * Normalize a field value or query term for comparison.
 */
function normalize(val) {
  if (typeof val !== 'string') {
    return val;
  }
  return unicodeUtils.fold(unicodeUtils.normalize(val)).toLowerCase();
}

/**
 * Filter that matches annotations against a single field & term.
 *
 * eg. "quote:foo" or "text:bar"
 *
 * @implements {Filter}
 */
class TermFilter {
  /**
   * @param {string} field - Name of field to match
   * @param {string} term - Query term
   * @param {Checker} checker - Functions for extracting term values from
   *   an annotation and checking whether they match a query term.
   */
  constructor(field, term, checker) {
    this.field = field;
    this.term = term;
    this.checker = checker;
  }

  matches(ann) {
    const checker = this.checker;
    if (checker.autofalse && checker.autofalse(ann)) {
      return false;
    }

    let value = checker.value(ann);
    if (Array.isArray(value)) {
      value = value.map(normalize);
    } else {
      value = normalize(value);
    }
    return checker.match(this.term, value);
  }
}

/**
 * Filter that combines other filters using AND or OR combinators.
 *
 * @implements {Filter}
 */
class BinaryOpFilter {
  /**
   * @param {'and'|'or'} op - Binary operator
   * @param {Filter[]} filters - Array of filters to test against
   */
  constructor(op, filters) {
    this.operator = op;
    this.filters = filters;
  }

  matches(ann) {
    if (this.operator === 'and') {
      return this.filters.every(filter => filter.matches(ann));
    } else {
      return this.filters.some(filter => filter.matches(ann));
    }
  }
}

/**
 * Functions for extracting field values from annotations and testing whether
 * they match a query term.
 *
 * [facet_name]:
 *   autofalse: a function for a preliminary false match result
 *   value: a function to extract to facet value for the annotation.
 *   match: a function to check if the extracted value matches the facet value
 *
 * @type {Object.<string,Checker>}
 */
const fieldMatchers = {
  quote: {
    autofalse: ann => (ann.references || []).length > 0,
    value: ann => quote(ann) || '',
    match: (term, value) => value.indexOf(term) > -1,
  },
  since: {
    autofalse: ann => typeof ann.updated !== 'string',
    value: ann => new Date(ann.updated),
    match(term, value) {
      const delta = (Date.now() - value) / 1000;
      return delta <= term;
    },
  },
  tag: {
    autofalse: ann => !Array.isArray(ann.tags),
    value: ann => ann.tags,
    match: (term, value) => value.includes(term),
  },
  text: {
    autofalse: ann => typeof ann.text !== 'string',
    value: ann => ann.text,
    match: (term, value) => value.indexOf(term) > -1,
  },
  uri: {
    autofalse: ann => typeof ann.uri !== 'string',
    value: ann => ann.uri,
    match: (term, value) => value.indexOf(term) > -1,
  },
  user: {
    autofalse: ann => typeof ann.user !== 'string',
    value: ann => ann.user + ' ' + displayName(ann),
    match: (term, value) => value.indexOf(term) > -1,
  },
};

/**
 * Filters a set of annotations.
 *
 * @param {Annotation[]} annotations
 * @param {Object} filters - Faceted filter generated by
 * `generateFacetedFilter`.
 * @return {string[]} IDs of matching annotations.
 */
export default function filterAnnotations(annotations, filters) {
  // Convert the input filter object into a filter tree, expanding "any"
  // filters.
  const fieldFilters = Object.entries(filters)
    .filter(([, filter]) => filter.terms.length > 0)
    .map(([field, filter]) => {
      const terms = filter.terms.map(normalize);
      let termFilters;
      if (field === 'any') {
        const anyFields = ['quote', 'text', 'tag', 'user'];
        termFilters = terms.map(
          term =>
            new BinaryOpFilter(
              'or',
              anyFields.map(
                field => new TermFilter(field, term, fieldMatchers[field])
              )
            )
        );
      } else {
        termFilters = terms.map(
          term => new TermFilter(field, term, fieldMatchers[field])
        );
      }
      return new BinaryOpFilter(filter.operator, termFilters);
    });

  const rootFilter = new BinaryOpFilter('and', fieldFilters);

  return annotations
    .filter(ann => {
      return ann.id && rootFilter.matches(ann);
    })
    .map(ann => /** @type {string} */ (ann.id));
}
