const { createElement } = require('preact');
const classnames = require('classnames');
const propTypes = require('prop-types');
const { useMemo } = require('preact/hooks');

/**
 * Custom datalist component
 */

function DataList({
  activeItem = -1,
  list,
  listFormatter = item => item,
  onSelectItem,
  open = false,
}) {
  const items = useMemo(() => {
    return list.map((item, index) => {
      return (
        <li
          key={`datalist-${index}`}
          className={classnames({
            'is-selected': activeItem === index,
          })}
          onClick={() => {
            onSelectItem(item);
          }}
        >
          {listFormatter(item, index)}
        </li>
      );
    });
  }, [activeItem, list, listFormatter, onSelectItem]);

  return (
    <div className="datalist">
      {list.length && open && (
        <div className="datalist__items">
          <span className="datalist__arrow-down"/>
          <ul className="datalist__ul">{items}</ul>
        </div>
      )}
    </div>
  );
}

DataList.propTypes = {
  /**
   * The activeItem is highlighted.
   */
  activeItem: propTypes.number,
  /**
   * The list of items to render. This can be a simple list of
   * strings or a list of objects when used with listFormatter.
   */
  list: propTypes.array.isRequired,
  /**
   * An optional formatter to render each item inside an <li> tag
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

  open: propTypes.boolean,
};

module.exports = DataList;
