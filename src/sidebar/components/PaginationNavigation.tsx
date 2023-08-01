import {
  Button,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@hypothesis/frontend-shared';
import type { ButtonCommonProps } from '@hypothesis/frontend-shared/lib/components/input/ButtonBase';
import type { PresentationalProps } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';
import type { JSX } from 'preact';

import { pageNumberOptions } from '../util/pagination';

type NavigationButtonProps = PresentationalProps &
  ButtonCommonProps &
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'size'>;

function NavigationButton({ ...buttonProps }: NavigationButtonProps) {
  return (
    <Button
      classes={classnames(
        'px-3.5 py-2.5 gap-x-1',
        'font-semibold',
        // These colors are the same as the "dark" variant of IconButton
        'text-grey-7 bg-grey-2 enabled:hover:text-grey-9 enabled:hover:bg-grey-3',
        'disabled:text-grey-5 aria-pressed:bg-grey-3 aria-expanded:bg-grey-3',
      )}
      {...buttonProps}
      size="custom"
      variant="custom"
    />
  );
}

export type PaginationNavigationProps = {
  /** 1-indexed page number of currently-visible page of results */
  currentPage: number;
  onChangePage: (page: number) => void;
  totalPages: number;
};

/**
 * Render pagination navigation controls, with buttons to go next, previous
 * and nearby pages. Buttons corresponding to nearby pages are shown on wider
 * screens; for narrow screens only Prev and Next buttons are shown.
 *
 */
function PaginationNavigation({
  currentPage,
  onChangePage,
  totalPages,
}: PaginationNavigationProps) {
  // Pages are 1-indexed
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const pageNumbers = pageNumberOptions(currentPage, totalPages);

  /**
   * @param {number} pageNumber
   * @param {HTMLElement} element
   */
  const changePageTo = (pageNumber: number, element: HTMLElement) => {
    onChangePage(pageNumber);
    // Because changing pagination page doesn't reload the page (as it would
    // in a "traditional" HTML context), the clicked-upon navigation button
    // will awkwardly retain focus unless it is actively removed.
    // TODO: Evaluate this for a11y issues
    element.blur();
  };

  return (
    <div
      className="flex items-center text-md"
      data-testid="pagination-navigation"
    >
      <div className="w-28 h-10">
        {hasPreviousPage && (
          <NavigationButton
            title="Go to previous page"
            onClick={e =>
              changePageTo(currentPage - 1, e.target as HTMLElement)
            }
          >
            <ArrowLeftIcon />
            prev
          </NavigationButton>
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
          'md:grow',
        )}
      >
        {pageNumbers.map((page, idx) => (
          <li key={idx}>
            {page === null ? (
              <div data-testid="pagination-gap">...</div>
            ) : (
              <NavigationButton
                key={`page-${idx}`}
                title={`Go to page ${page}`}
                pressed={page === currentPage}
                onClick={e => changePageTo(page, e.target as HTMLElement)}
              >
                {page.toString()}
              </NavigationButton>
            )}
          </li>
        ))}
      </ul>
      <div
        className={classnames(
          'w-28 h-10 flex justify-end',
          // When page buttons are not shown, this element should grow to fill
          // available space. But when page buttons are shown, it should not.
          'grow md:grow-0',
        )}
      >
        {hasNextPage && (
          <NavigationButton
            title="Go to next page"
            onClick={e =>
              changePageTo(currentPage + 1, e.target as HTMLElement)
            }
          >
            next
            <ArrowRightIcon />
          </NavigationButton>
        )}
      </div>
    </div>
  );
}

export default PaginationNavigation;
