import { createElement } from 'preact';
import classnames from 'classnames';
import { useMemo } from 'preact/hooks';
import propTypes from 'prop-types';

const defaultListFormatter = item => item;

/**
 * Custom autocomplete component. Use this in conjunction with an <input> field.
 * To make this component W3 accessibility compliant, it is is intended to be
 * coupled to an <input> field or the TagEditor component and can not be
 * used by itself.
 *
 * Modeled after the "ARIA 1.1 Combobox with Listbox Popup"
 */

export default function AutocompleteList({
  activeItem = -1,
  id,
  itemPrefixId,
  list,
  listFormatter = defaultListFormatter,
  onSelectItem,
  open = false,
}) {
  const items = useMemo(() => {
    return list.map((item, index) => {
      // only add an id if itemPrefixId is passed
      const props = itemPrefixId ? { id: `${itemPrefixId}${index}` } : {};

      return (
        // The parent <input> field should capture keyboard events
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <li
          key={`autocomplete-list-${index}`}
          role="option"
          aria-selected={(activeItem === index).toString()}
          className={classnames(
            {
              'is-selected': activeItem === index,
            },
            'autocomplete-list__li'
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
    <div
      className={classnames(
        {
          'is-hidden': isHidden,
        },
        'autocomplete-list'
      )}
    >
      <ul
        className="autocomplete-list__items"
        tabIndex="-1"
        aria-label="Suggestions"
        role="listbox"
        {...props}
      >
        {items}
      </ul>
    </div>
  );
}

AutocompleteList.propTypes = {
  /**
   * The index of the highlighted item.
   */
  activeItem: propTypes.number,
  /**
   * Optional unique HTML attribute id. This can be used for
   * parent `aria-controls` coupling.
   */
  id: propTypes.string,
  /**
   * Optional unique HTML attribute id prefix for each item in the list.
   * The final value of each items' id is `{itemPrefixId}{activeItem}`
   */
  itemPrefixId: propTypes.string,

  /**
   * The list of items to render. This can be a simple list of
   * strings or a list of objects when used with listFormatter.
   */
  list: propTypes.array.isRequired,
  /**
   * An optional formatter to render each item inside an <li> tag
   * This is useful if the list is an array of objects rather than
   * just strings.
   */
  listFormatter: propTypes.func,
  /**
   * Callback when an item is clicked with the mouse.
   *  (item, index) => {}
   */
  onSelectItem: propTypes.func.isRequired,
  /**
   * Is the list open or closed?
   */
  open: propTypes.bool,
};
