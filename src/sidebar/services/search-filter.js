'use strict';

/**
 * Splits a search term into filter and data.
 *
 * ie. 'user:johndoe' -> ['user', 'johndoe']
 *     'example:text' -> [null, 'example:text']
 */
function splitTerm(term) {
  const filter = term.slice(0, term.indexOf(':'));
  if (!filter) {
    // The whole term is data
    return [null, term];
  }

  if (
    [
      'group',
      'quote',
      'result',
      'since',
      'tag',
      'text',
      'uri',
      'user',
    ].includes(filter)
  ) {
    const data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    // The filter is not a power search filter, so the whole term is data
    return [null, term];
  }
}

/**
 * Tokenize a search query.
 *
 * Splits `searchtext` into tokens, separated by spaces.
 * Quoted phrases in `searchtext` are returned as a single token.
 */
function tokenize(searchtext) {
  if (!searchtext) {
    return [];
  }

  // Small helper function for removing quote characters
  // from the beginning- and end of a string, if the
  // quote characters are the same.
  // I.e.
  //   'foo' -> foo
  //   "bar" -> bar
  //   'foo" -> 'foo"
  //   bar"  -> bar"
  const _removeQuoteCharacter = function(text) {
    const start = text.slice(0, 1);
    const end = text.slice(-1);
    if ((start === '"' || start === "'") && start === end) {
      text = text.slice(1, text.length - 1);
    }
    return text;
  };

  let tokens = searchtext.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

  // Cut the opening and closing quote characters
  tokens = tokens.map(_removeQuoteCharacter);

  // Remove quotes for power search.
  // I.e. 'tag:"foo bar"' -> 'tag:foo bar'
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const [filter, data] = splitTerm(token);
    if (filter) {
      tokens[index] = filter + ':' + _removeQuoteCharacter(data);
    }
  }

  return tokens;
}

/**
 * Parse a search query into a map of search field to term.
 *
 * @param {string} searchtext
 * @return {Object}
 */
function toObject(searchtext) {
  const obj = {};
  const backendFilter = f => (f === 'tag' ? 'tags' : f);

  const addToObj = function(key, data) {
    if (obj[key]) {
      return obj[key].push(data);
    } else {
      return (obj[key] = [data]);
    }
  };

  if (searchtext) {
    const terms = tokenize(searchtext);
    for (const term of terms) {
      let [filter, data] = splitTerm(term);
      if (!filter) {
        filter = 'any';
        data = term;
      }
      addToObj(backendFilter(filter), data);
    }
  }
  return obj;
}

/**
 * @typedef Facet
 * @property {'and'|'or'|'min'} operator
 * @property {boolean} lowercase
 * @property {string[]} terms
 */

/**
 * Parse a search query into a map of filters.
 *
 * Returns an object mapping facet names to Facet.
 *
 * Terms that are not associated with a particular facet are stored in the "any"
 * facet.
 *
 * @param {string} searchtext
 * @return {Object}
 */
function generateFacetedFilter(searchtext, focusedUser) {
  let terms;
  const any = [];
  const quote = [];
  const result = [];
  const since = [];
  const tag = [];
  const text = [];
  const uri = [];
  const user = focusedUser ? [focusedUser] : [];

  if (searchtext) {
    terms = tokenize(searchtext);
    for (const term of terms) {
      let t;
      const filter = term.slice(0, term.indexOf(':'));
      switch (filter) {
        case 'quote':
          quote.push(term.slice(6));
          break;
        case 'result':
          result.push(term.slice(7));
          break;
        case 'since':
          {
            // We'll turn this into seconds
            let time = term.slice(6).toLowerCase();
            if (time.match(/^\d+$/)) {
              // Only digits, assuming seconds
              since.push(time * 1);
            }
            if (time.match(/^\d+sec$/)) {
              // Time given in seconds
              t = /^(\d+)sec$/.exec(time)[1];
              since.push(t * 1);
            }
            if (time.match(/^\d+min$/)) {
              // Time given in minutes
              t = /^(\d+)min$/.exec(time)[1];
              since.push(t * 60);
            }
            if (time.match(/^\d+hour$/)) {
              // Time given in hours
              t = /^(\d+)hour$/.exec(time)[1];
              since.push(t * 60 * 60);
            }
            if (time.match(/^\d+day$/)) {
              // Time given in days
              t = /^(\d+)day$/.exec(time)[1];
              since.push(t * 60 * 60 * 24);
            }
            if (time.match(/^\d+week$/)) {
              // Time given in week
              t = /^(\d+)week$/.exec(time)[1];
              since.push(t * 60 * 60 * 24 * 7);
            }
            if (time.match(/^\d+month$/)) {
              // Time given in month
              t = /^(\d+)month$/.exec(time)[1];
              since.push(t * 60 * 60 * 24 * 30);
            }
            if (time.match(/^\d+year$/)) {
              // Time given in year
              t = /^(\d+)year$/.exec(time)[1];
              since.push(t * 60 * 60 * 24 * 365);
            }
          }
          break;
        case 'tag':
          tag.push(term.slice(4));
          break;
        case 'text':
          text.push(term.slice(5));
          break;
        case 'uri':
          uri.push(term.slice(4));
          break;
        case 'user':
          user.push(term.slice(5));
          break;
        default:
          any.push(term);
      }
    }
  }

  return {
    any: {
      terms: any,
      operator: 'and',
    },
    quote: {
      terms: quote,
      operator: 'and',
    },
    result: {
      terms: result,
      operator: 'min',
    },
    since: {
      terms: since,
      operator: 'and',
    },
    tag: {
      terms: tag,
      operator: 'and',
    },
    text: {
      terms: text,
      operator: 'and',
    },
    uri: {
      terms: uri,
      operator: 'or',
    },
    user: {
      terms: user,
      operator: 'or',
    },
  };
}

/**
 * Parse annotation filter queries into structured representations.
 *
 * Provides methods to parse Lucene-style queries ("foo tag: bar")
 * into structured representations which are then used by other services to
 * filter annotations displayed to the user or fetched from the API.
 */
// @ngInject
function searchFilter() {
  return {
    toObject,
    generateFacetedFilter,
  };
}

module.exports = searchFilter;
