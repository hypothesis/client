import classnames from 'classnames';

import {
  Link,
  LinkUnstyled,
  CaretLeftIcon,
  CaretRightIcon,
} from '@hypothesis/frontend-shared/lib/next';

/**
 * @typedef {import('../../types/annotator').ContentInfoConfig} ContentInfoConfig
 */

/**
 * A banner that displays information about the current document and the entity
 * that is providing access to it (eg. JSTOR).
 *
 * Layout columns:
 *  - Logo
 *  - Container title (only shown on screens at `2xl` breakpoint and wider)
 *  - Item title with previous and next links
 *
 * @param {object} props
 *   @param {ContentInfoConfig} props.info
 */
export default function ContentInfoBanner({ info }) {
  // Format item title to show subtitle
  const itemTitle = `${info.item.title}${info.item.subtitle && ': '}${
    info.item.subtitle
  }`;
  return (
    <div
      className={classnames(
        'h-10 bg-white px-4 text-slate-7 text-annotator-base border-b',
        'grid items-center',
        // Two columns in narrower viewports; three in wider
        'grid-cols-[100px_minmax(0,auto)]',
        '2xl:grid-cols-[100px_minmax(0,auto)_minmax(0,auto)] 2xl:gap-x-3'
      )}
    >
      <div data-testid="content-logo">
        {info.logo && (
          <Link href={info.logo.link} target="_blank" data-testid="logo-link">
            <img
              alt={info.logo.title}
              src={info.logo.logo}
              data-testid="logo-image"
            />
          </Link>
        )}
      </div>
      <div
        className={classnames(
          // Container title (this element) is not shown on narrow screens
          'hidden',
          '2xl:block 2xl:whitespace-nowrap 2xl:overflow-hidden 2xl:text-ellipsis',
          'font-semibold'
        )}
        data-testid="content-container-info"
        title={info.container.title}
      >
        {info.container.title}
      </div>
      <div
        className={classnames(
          // Flex layout for item title, next and previous links
          'flex justify-center items-center gap-x-2'
        )}
        data-testid="content-item-info"
      >
        <div
          className={classnames(
            // Narrower viewports center this flex content:
            // this element is not needed for alignment
            'hidden',
            // Wider viewports align this flex content to the right:
            // This empty element is needed to fill extra space at left
            '2xl:block 2xl:grow'
          )}
        />
        {info.links.previousItem && (
          <>
            <Link
              classes="flex gap-x-1 items-center text-annotator-sm whitespace-nowrap"
              title="Open previous item"
              href={info.links.previousItem}
              underline="always"
              target="_blank"
              data-testid="content-previous-link"
            >
              <CaretLeftIcon className="w-em h-em" />
              <span>Previous</span>
            </Link>
            <div className="text-annotator-sm">|</div>
          </>
        )}
        <div
          className={classnames(
            // This element will shrink and truncate fluidly.
            // Overriding min-width `auto` prevents the content from overflowing
            // See https://stackoverflow.com/a/66689926/434243.
            'min-w-0 whitespace-nowrap overflow-hidden text-ellipsis shrink font-medium'
          )}
        >
          <LinkUnstyled
            title={itemTitle}
            href={info.links.currentItem}
            data-testid="content-item-link"
            target="_blank"
          >
            {itemTitle}
          </LinkUnstyled>
        </div>

        {info.links.nextItem && (
          <>
            <div className="text-annotator-sm">|</div>
            <Link
              title="Open next item"
              classes="flex gap-x-1 items-center text-annotator-sm whitespace-nowrap"
              href={info.links.nextItem}
              underline="always"
              target="_blank"
              data-testid="content-next-link"
            >
              <span>Next</span>
              <CaretRightIcon className="w-em h-em" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
