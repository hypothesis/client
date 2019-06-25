'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const { useRef, useState } = require('preact/hooks');
const propTypes = require('prop-types');

const useStore = require('../store/use-store');

const Spinner = require('./spinner');

/**
 * An input field in the top bar for entering a query that filters annotations
 * (in the sidebar) or searches annotations (in the stream/single annotation
 * view).
 *
 * This component also renders a loading spinner to indicate when the client
 * is fetching for data from the API or in a "loading" state for any other
 * reason.
 */
function SearchInput({ alwaysExpanded, query, onSearch }) {
  const isLoading = useStore(store => store.isLoading());
  const input = useRef();

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  const onSubmit = e => {
    e.preventDefault();
    onSearch(input.current.value);
  };

  // When the active query changes outside of this component, update the input
  // field to match. This happens when clearing the current filter for example.
  if (query !== prevQuery) {
    setPendingQuery(query);
    setPrevQuery(query);
  }

  return (
    <form className="search-input__form" name="searchForm" onSubmit={onSubmit}>
      <input
        className={classnames('search-input__input', {
          'is-expanded': alwaysExpanded || query,
        })}
        type="text"
        name="query"
        placeholder={(isLoading && 'Loading…') || 'Search…'}
        disabled={isLoading}
        ref={input}
        value={pendingQuery}
        onInput={e => setPendingQuery(e.target.value)}
      />
      {!isLoading && (
        <button
          type="button"
          className="search-input__icon top-bar__btn"
          title="Search"
          onClick={() => input.current.focus()}
        >
          <i className="h-icon-search" />
        </button>
      )}
      {isLoading && <Spinner className="top-bar__btn" title="Loading…" />}
    </form>
  );
}

SearchInput.propTypes = {
  /**
   * If true, the input field is always shown. If false, the input field is
   * only shown if the query is non-empty.
   */
  alwaysExpanded: propTypes.bool,

  /**
   * The currently active filter query.
   */
  query: propTypes.string,

  /**
   * Callback to invoke when the current filter query changes.
   */
  onSearch: propTypes.func,
};

module.exports = SearchInput;
