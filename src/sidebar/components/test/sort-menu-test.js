'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const SortMenu = require('../sort-menu');
const MenuItem = require('../menu-item');

describe('SortMenu', () => {
  let fakeState;
  let fakeStore;

  const createSortMenu = () => {
    return shallow(<SortMenu />);
  };

  beforeEach(() => {
    fakeState = {
      sortKey: 'Location',
      sortKeysAvailable: ['Newest', 'Oldest', 'Location'],
    };
    fakeStore = {
      setSortKey: sinon.stub(),
      getState: sinon.stub().returns(fakeState),
    };

    SortMenu.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    SortMenu.$imports.$restore();
  });

  it('renders a menu item for each sort option', () => {
    const wrapper = createSortMenu();

    const menuItems = wrapper.find(MenuItem);

    assert.lengthOf(menuItems, fakeState.sortKeysAvailable.length);
    fakeState.sortKeysAvailable.forEach(sortKey => {
      assert.lengthOf(
        menuItems.filterWhere(menuItem => menuItem.prop('label') === sortKey),
        1
      );
    });
  });

  it('renders current sort key menu item as selected', () => {
    const wrapper = createSortMenu();

    const currentSortKeyMenuItem = wrapper
      .find(MenuItem)
      .filterWhere(menuItem => menuItem.prop('label') === fakeState.sortKey);
    assert.isTrue(currentSortKeyMenuItem.prop('isSelected'));
  });

  it('sets the sort key via action when onClick callback invoked', () => {
    const wrapper = createSortMenu();
    const menuItems = wrapper.find(MenuItem);

    menuItems.forEach(menuItem => {
      const callback = menuItem.prop('onClick');

      callback();

      const lastCall = fakeStore.setSortKey.lastCall;
      assert.calledWith(lastCall, menuItem.prop('label'));
    });
  });
});
