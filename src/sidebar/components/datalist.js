const { createElement } = require('preact');
const classnames = require('classnames');
const propTypes = require('prop-types');
const { useMemo } = require('preact/hooks');

/**
 * Custom datalist component. Use this in conjunction with an input field.
 */

function Datalist({
  activeItem = -1,
  id,
  itemPrefixId,
  list,
  listFormatter = item => item,
  onSelectItem,
  open = false,
}) {
  const items = useMemo(() => {
    return list.map((item, index) => {
      // only add an id if itemPrefixId is passed
      const props = itemPrefixId ? { id: `${itemPrefixId}${index}` } : {};

      return (
        <li
          key={`datalist-${index}`}
          role="option"
          aria-selected={activeItem === index}
          className={classnames({
            'is-selected': activeItem === index,
          })}
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
  return (
    <div className="datalist">
      {list.length > 0 && open && (
        <div className="datalist__items">
          <ul
            tabIndex="-1"
            aria-label="Suggestions"
            role="listbox"
            className="datalist__ul"
            {...props}
          >
            {items}
          </ul>
        </div>
      )}
    </div>
  );
}

Datalist.propTypes = {
  /**
   * The activeItem is highlighted.
   */
  activeItem: propTypes.number,
  /**
   * Optional unique HTML attribute id.
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

module.exports = Datalist;
