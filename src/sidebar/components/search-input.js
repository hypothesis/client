import classnames from 'classnames';
import { createElement } from 'preact';
import { useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import useStore from '../store/use-store';

import Button from './button';
import Spinner from './spinner';

/**
 * An input field in the top bar for entering a query that filters annotations
 * (in the sidebar) or searches annotations (in the stream/single annotation
 * view).
 *
 * This component also renders a loading spinner to indicate when the client
 * is fetching for data from the API or in a "loading" state for any other
 * reason.
 */
export default function SearchInput({ alwaysExpanded, query, onSearch }) {
  const isLoading = useStore(store => store.isLoading());
  const input = useRef();

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  const onSubmit = e => {
    e.preventDefault();
    if (input.current.value || prevQuery) {
      // Don't set an initial empty query, but allow a later empty query to
      // clear `prevQuery`
      onSearch(input.current.value);
    }
  };

  // When the active query changes outside of this component, update the input
  // field to match. This happens when clearing the current filter for example.
  if (query !== prevQuery) {
    setPendingQuery(query);
    setPrevQuery(query);
  }

  return (
    <form
      action="#"
      className="search-input__form"
      name="searchForm"
      onSubmit={onSubmit}
    >
      <input
        aria-label="Search"
        className={classnames('search-input__input', {
          'is-expanded': alwaysExpanded || query,
        })}
        dir="auto"
        type="text"
        name="query"
        placeholder={(isLoading && 'Loading…') || 'Search…'}
        disabled={isLoading}
        ref={input}
        value={pendingQuery}
        onInput={e => setPendingQuery(e.target.value)}
      />
      {!isLoading && (
        <Button
          className="search-input__icon-button top-bar__icon-button"
          icon="search"
          onClick={() => input.current.focus()}
          title="Search annotations"
        />
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
