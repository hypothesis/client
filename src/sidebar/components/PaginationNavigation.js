import propTypes from 'prop-types';

import Button from './Button';

/** @typedef {number|null} PageNumber */

/**
 * Determine the set of page number buttons to show in the navigation
 * controls, in addition to "next" and "back" buttons.
 *
 * @param {number} totalPages
 * @param {number} currentPage
 * @return {PageNumber[]} Set of navigation page options to show. `null`
 *   values represent gaps in the sequence of pages, to be represented later
 *   as ellipses (...)
 */
function availablePageButtons(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }
  // Maximum number of distinct pages to show in controls
  const MAX_PAGES = 5;

  // Start with first, last and current page. Use a set to avoid dupes.
  const pageNumbers = new Set([1, currentPage, totalPages]);

  // Fill out the `pageNumbers` with additional pages near the currentPage,
  // if available
  let increment = 1;
  while (pageNumbers.size < Math.min(totalPages, MAX_PAGES)) {
    // Build the set "outward" from the currently-active page
    if (currentPage + increment <= totalPages) {
      pageNumbers.add(currentPage + increment);
    }
    if (currentPage - increment >= 1) {
      pageNumbers.add(currentPage - increment);
    }
    increment++;
  }

  const pageOptions = /** @type {PageNumber[]} */ ([]);
  [...pageNumbers]
    .sort((a, b) => a - b)
    .forEach((page, idx, arr) => {
      if (idx > 0 && page - arr[idx - 1] > 1) {
        // Two page entries are non-sequential. Push a `null` value between
        // them to indicate the gap, which will later be represented as an
        // ellipsis
        pageOptions.push(null);
      }
      pageOptions.push(page);
    });
  return pageOptions;
}

/**
 * @typedef PaginationNavigationProps
 * @prop {number} currentPage - The currently-visible page of results
 * @prop {(page: number) => void} onChangePage - Callback for changing page
 * @prop {number} totalPages
 */

/**
 *  Render pagination navigation controls, with buttons to go to previous
 *  and next pages (where relevant) and up to five numbered page buttons.
 *
 * @param {PaginationNavigationProps} props
 */
function PaginationNavigation({ currentPage, onChangePage, totalPages }) {
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const pageNumbers = availablePageButtons(currentPage, totalPages);

  const changePageTo = (pageNumber, eventTarget) => {
    onChangePage(pageNumber);
    // Because changing pagination page doesn't reload the page (as it would
    // in a "traditional" HTML context), the clicked-upon navigation button
    // will awkwardly retain focus unless it is actively removed.
    // TODO: Evaluate this for a11y issues
    /** @type HTMLElement */ (eventTarget)?.blur();
  };

  return (
    <div className="PaginationNavigation">
      <div className="PaginationNavigation__relative PaginationNavigation__prev">
        {hasPreviousPage && (
          <Button
            className="PaginationNavigation__button"
            icon="arrow-left"
            buttonText="prev"
            title="Go to previous page"
            onClick={e => changePageTo(currentPage - 1, e.target)}
          />
        )}
      </div>
      <ul className="PaginationNavigation__pages">
        {pageNumbers.map((page, idx) => (
          <li key={`page-${idx}`}>
            {page === null ? (
              <div className="PaginationNavigation__gap">...</div>
            ) : (
              <Button
                key={`page-${idx}`}
                buttonText={page.toString()}
                className="PaginationNavigation__page-button"
                isPressed={page === currentPage}
                onClick={e => changePageTo(page, e.target)}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="PaginationNavigation__relative PaginationNavigation__next">
        {hasNextPage && (
          <Button
            className="PaginationNavigation__button PaginationNavigation__button-right"
            icon="arrow-right"
            buttonText="next"
            iconPosition="right"
            onClick={e => changePageTo(currentPage + 1, e.target)}
          />
        )}
      </div>
    </div>
  );
}

PaginationNavigation.propTypes = {
  currentPage: propTypes.number,
  onChangePage: propTypes.func,
  totalPages: propTypes.number,
};

export default PaginationNavigation;
