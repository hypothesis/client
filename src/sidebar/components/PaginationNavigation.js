import { LabeledButton } from '@hypothesis/frontend-shared';

import { pageNumberOptions } from '../util/pagination';

/**
 * @typedef PaginationNavigationProps
 * @prop {number} currentPage - The currently-visible page of results. Pages
 *   start at 1 (not 0).
 * @prop {(page: number) => void} onChangePage - Callback for changing page
 * @prop {number} totalPages
 */

/**
 * Render pagination navigation controls, with buttons to go next, previous
 * and nearby pages.
 *
 * @param {PaginationNavigationProps} props
 */
function PaginationNavigation({ currentPage, onChangePage, totalPages }) {
  // Pages are 1-indexed
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const pageNumbers = pageNumberOptions(currentPage, totalPages);

  /**
   * @param {number} pageNumber
   * @param {HTMLElement} element
   */
  const changePageTo = (pageNumber, element) => {
    onChangePage(pageNumber);
    // Because changing pagination page doesn't reload the page (as it would
    // in a "traditional" HTML context), the clicked-upon navigation button
    // will awkwardly retain focus unless it is actively removed.
    // TODO: Evaluate this for a11y issues
    element.blur();
  };

  return (
    <div className="PaginationNavigation">
      <div className="PaginationNavigation__relative PaginationNavigation__prev">
        {hasPreviousPage && (
          <LabeledButton
            classes="PaginationPageButton"
            icon="arrow-left"
            title="Go to previous page"
            onClick={e =>
              changePageTo(
                currentPage - 1,
                /** @type {HTMLElement} */ (e.target)
              )
            }
            variant="dark"
          >
            prev
          </LabeledButton>
        )}
      </div>
      <ul className="PaginationNavigation__pages">
        {pageNumbers.map((page, idx) => (
          <li key={idx}>
            {page === null ? (
              <div className="PaginationNavigation__gap">...</div>
            ) : (
              <LabeledButton
                classes="PaginationPageButton"
                key={`page-${idx}`}
                title={`Go to page ${page}`}
                pressed={page === currentPage}
                onClick={e =>
                  changePageTo(page, /** @type {HTMLElement} */ (e.target))
                }
                variant="dark"
              >
                {page.toString()}
              </LabeledButton>
            )}
          </li>
        ))}
      </ul>
      <div className="PaginationNavigation__relative PaginationNavigation__next">
        {hasNextPage && (
          <LabeledButton
            classes="PaginationPageButton"
            icon="arrow-right"
            iconPosition="right"
            title="Go to next page"
            onClick={e =>
              changePageTo(
                currentPage + 1,
                /** @type {HTMLElement} */ (e.target)
              )
            }
            variant="dark"
          >
            next
          </LabeledButton>
        )}
      </div>
    </div>
  );
}

export default PaginationNavigation;
