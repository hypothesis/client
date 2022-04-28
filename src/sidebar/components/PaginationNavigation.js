import { LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

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
 * and nearby pages. Buttons corresponding to nearby pages are shown on wider
 * screens; for narrow screens only Prev and Next buttons are shown.
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
    <div
      className="flex items-center text-lg"
      data-testid="pagination-navigation"
    >
      <div className="w-28 h-10">
        {hasPreviousPage && (
          <LabeledButton
            classes="p-navigation-button"
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
      <ul
        className={classnames(
          // Where there's enough horizontal space,
          // lay out page navigation buttons horizontally between prev/next:
          // | prevPage  |       numberedPages          | nextPage
          //
          // e.g.
          // | [<- prev] | [2] ... [5] [6] [7] ... [10] | [next ->] |
          //
          // These page buttons are hidden on narrow screens
          'hidden',
          // For slightly wider screens, they are shown in a horizontal row
          'md:flex md:items-center md:justify-center md:gap-x-2',
          // when visible, this element should stretch to fill available space
          'md:grow'
        )}
      >
        {pageNumbers.map((page, idx) => (
          <li key={idx}>
            {page === null ? (
              <div data-testid="pagination-gap">...</div>
            ) : (
              <LabeledButton
                classes="p-navigation-button"
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
      <div
        className={classnames(
          'w-28 h-10 flex justify-end',
          // When page buttons are not shown, this element should grow to fill
          // available space. But when page buttons are shown, it should not.
          'grow md:grow-0'
        )}
      >
        {hasNextPage && (
          <LabeledButton
            classes="p-navigation-button"
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
