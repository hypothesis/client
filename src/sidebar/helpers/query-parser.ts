const filterFields = [
  'cfi',
  'quote',
  'page',
  'since',
  'tag',
  'text',
  'uri',
  'user',
] as const;

/**
 * Names of supported fields that can be specified via `{filename}:{term}`
 * in {@link parseFilterQuery}.
 */
export type FilterField = (typeof filterFields)[number];

const searchFields = ['group', 'quote', 'tag', 'text', 'uri', 'user'] as const;

/**
 * Names of fields that can be used in `{field}:{term}` queries with
 * {@link parseHypothesisSearchQuery}.
 */
export type SearchField = (typeof searchFields)[number];

/**
 * Splits a search term into filter and data.
 *
 * eg. 'user:johndoe' -> ['user', 'johndoe']
 *     'example:text' -> [null, 'example:text']
 *
 * @param term - The query term to parse
 * @param fieldNames - The set of recognized field names
 */
function splitTerm(
  term: string,
  fieldNames: readonly string[],
): [null | string, string] {
  const filter = term.slice(0, term.indexOf(':'));
  if (!filter) {
    // The whole term is data
    return [null, term];
  }

  if (fieldNames.includes(filter)) {
    const data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    // The filter is not a power search filter, so the whole term is data
    return [null, term];
  }
}

/**
 * Remove a quote character from the beginning and end of the string, but
 * only if they match. ie:
 *
 *   'foo' -> foo
 *   "bar" -> bar
 *   'foo" -> 'foo"
 *    bar"  -> bar"
 */
function removeSurroundingQuotes(text: string) {
  const start = text.slice(0, 1);
  const end = text.slice(-1);
  if ((start === '"' || start === "'") && start === end) {
    text = text.slice(1, text.length - 1);
  }
  return text;
}

/**
 * Tokenize a search query.
 *
 * Split `query` into an array of non-empty tokens. Terms not contained
 * within quotes are split on whitespace. Terms inside single or double quotes
 * are returned as whole tokens, with the surrounding quotes removed.
 */
function tokenize(query: string, fieldNames: readonly string[]): string[] {
  const tokenMatches = query.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!tokenMatches) {
    return [];
  }

  return tokenMatches
    .map(removeSurroundingQuotes)
    .filter(token => token.length > 0)
    .map(token => {
      // Strip quotes from field values.
      // eg. `tag:"foo bar"` => `tag:foo bar`.
      const [filter, data] = splitTerm(token, fieldNames);
      if (filter) {
        return filter + ':' + removeSurroundingQuotes(data);
      } else {
        return token;
      }
    });
}

/**
 * Parse a user-provided query ("term:value ...") into a key/value map that can
 * be used when constructing queries to the Hypothesis search API.
 */
export function parseHypothesisSearchQuery(
  query: string,
): Record<string, string[]> {
  const obj = {} as Record<string, string[]>;

  const backendFilter = (field: string) => (field === 'tag' ? 'tags' : field);

  const terms = tokenize(query, searchFields);
  for (const term of terms) {
    let [field, data] = splitTerm(term, searchFields);
    if (!field) {
      field = 'any';
      data = term;
    }

    const backendField = backendFilter(field);
    if (obj[backendField]) {
      obj[backendField].push(data);
    } else {
      obj[backendField] = [data];
    }
  }

  return obj;
}

export type Facet = {
  /**
   * Whether to require annotations match all values in `terms` ("and") or at
   * least one value in `terms` ("or").
   */
  operator: 'and' | 'or';
  terms: string[] | number[];
};

export type ParsedQuery = Record<FilterField | 'any', Facet>;

/**
 * Parse a user-provided query into a map of filter field to term.
 *
 * Terms that are not associated with any particular field are stored under the
 * "any" property.
 *
 * @param query - Filter query to parse
 * @param addedFilters - Additional query terms to merge with the results of
 *   parsing `query`.
 */
export function parseFilterQuery(
  query: string,
  addedFilters: Partial<Record<FilterField, string>> = {},
): ParsedQuery {
  const initialTerms = (field: FilterField) => {
    const init = addedFilters[field];
    if (typeof init === 'string') {
      return [init];
    } else {
      return [];
    }
  };

  const cfi = initialTerms('cfi');
  const page = initialTerms('page');
  const quote = initialTerms('quote');
  const tag = initialTerms('tag');
  const text = initialTerms('text');
  const uri = initialTerms('uri');
  const user = initialTerms('user');

  const any = [];
  const since: number[] = [];

  const terms = tokenize(query, filterFields);

  for (const term of terms) {
    const filter = term.slice(0, term.indexOf(':'));
    const fieldValue = term.slice(filter.length + 1);

    switch (filter) {
      case 'cfi':
        cfi.push(fieldValue);
        break;
      case 'quote':
        quote.push(fieldValue);
        break;
      case 'page':
        page.push(fieldValue);
        break;
      case 'since':
        {
          const time = term.slice(6).toLowerCase();
          const secondsPerDay = 24 * 60 * 60;
          const secondsPerUnit = {
            sec: 1,
            min: 60,
            hour: 60 * 60,
            day: secondsPerDay,
            week: 7 * secondsPerDay,
            month: 30 * secondsPerDay,
            year: 365 * secondsPerDay,
          };
          const match = time.match(
            /^(\d+)(sec|min|hour|day|week|month|year)?$/,
          );
          if (match) {
            const value = parseFloat(match[1]);
            const unit = (match[2] || 'sec') as keyof typeof secondsPerUnit;
            since.push(value * secondsPerUnit[unit]);
          }
        }
        break;
      case 'tag':
        tag.push(fieldValue);
        break;
      case 'text':
        text.push(fieldValue);
        break;
      case 'uri':
        uri.push(fieldValue);
        break;
      case 'user':
        user.push(fieldValue);
        break;
      default:
        any.push(term);
    }
  }

  // Filter terms use an "AND" operator if it is possible for an annotation to
  // match more than one term (eg. an annotation can have multiple tags) or "OR"
  // otherwise (eg. an annotation cannot match two distinct user terms).

  return {
    any: {
      terms: any,
      operator: 'and',
    },
    cfi: {
      terms: cfi,
      operator: 'or',
    },
    quote: {
      terms: quote,
      operator: 'and',
    },
    page: {
      terms: page,
      operator: 'or',
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
