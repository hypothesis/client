import { Card } from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

import MenuArrow from './MenuArrow';

const defaultListFormatter = <Item,>(item: Item) => item;

export type AutocompleteListProps<Item> = {
  /**
   * The index of the highlighted item in the `list` of items. Defaults to `-1`
   * (no item selected)
   */
  activeItem?: number;

  /**
   * Optional unique HTML attribute id. This can be used for parent
   * `aria-controls` coupling.
   */
  id?: string;

  /**
   * Optional unique HTML attribute id prefix for each item in the list. The
   * final value of each items' id is `{itemPrefixId}{activeItem}`
   */
  itemPrefixId?: string;

  /**
   * The list of items to render. This can be a simple list of strings or a list
   * of objects when used with listFormatter.
   */
  list: Item[];

  /**
   * An optional formatter to render each item inside an <li> tag This is useful
   * if the list is an array of objects rather than just strings.
   */
  listFormatter?: (item: Item, index?: number) => any;

  /** Callback when an item is clicked */
  onSelectItem: (item: Item) => void;

  /** Is the AutocompleteList currently open (visible)? */
  open?: boolean;
};

/**
 * Custom autocomplete component. Use this in conjunction with an <input> field.
 * To make this component W3 accessibility compliant, it is is intended to be
 * coupled to an <input> field or the TagEditor component and can not be
 * used by itself.
 *
 * Modeled after the "ARIA 1.1 Combobox with Listbox Popup"
 */
export default function AutocompleteList<Item>({
  activeItem = -1,
  id,
  itemPrefixId,
  list,
  listFormatter = defaultListFormatter,
  onSelectItem,
  open = false,
}: AutocompleteListProps<Item>) {
  const items = useMemo(() => {
    return list.map((item, index) => {
      // only add an id if itemPrefixId is passed
      const props = itemPrefixId ? { id: `${itemPrefixId}${index}` } : {};

      return (
        // The parent <input> field should capture keyboard events
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <li
          key={`AutocompleteList-${index}`}
          role="option"
          aria-selected={(activeItem === index).toString()}
          className={classnames(
            'flex items-center',
            'border-l-4 py-1 px-3 cursor-pointer hover:bg-grey-2',
            'touch:h-touch-minimum',
            {
              'border-brand bg-grey-1': activeItem === index,
              'border-transparent': activeItem !== index,
            }
          )}
          onClick={() => {
            onSelectItem(item);
          }}
          {...props}
        >
          {listFormatter(item, index)}
        </li>
      );
    });
  }, [activeItem, itemPrefixId, list, listFormatter, onSelectItem]);

  const props = id ? { id } : {}; // only add the id if its passed
  const isHidden = list.length === 0 || !open;
  return (
    <div className="relative">
      <div
        className={classnames(
          { hidden: isHidden },
          // Move the Card down a bit to make room for the up-pointing arrow
          'absolute top-[3px] z-3',
          // Ensure Card width is not too narrow
          'min-w-[10em]'
        )}
        data-testid="autocomplete-list-container"
      >
        <Card width="auto">
          <ul tabIndex={-1} aria-label="Suggestions" role="listbox" {...props}>
            {items}
          </ul>
          <MenuArrow direction="up" classes="top-[-8px] left-[3px]" />
        </Card>
      </div>
    </div>
  );
}
