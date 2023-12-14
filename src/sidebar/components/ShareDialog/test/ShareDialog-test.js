import { Tab } from '@hypothesis/frontend-shared';
import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import ShareDialog from '../ShareDialog';
import { $imports } from '../ShareDialog';

describe('ShareDialog', () => {
  let fakeStore;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createComponent = (props = {}) =>
    mount(<ShareDialog shareTab {...props} />);

  beforeEach(() => {
    fakeStore = {
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
    };

    $imports.$mock(mockImportedComponents());
    // Don't mock these related components for now
    $imports.$restore({
      '../tabs/TabHeader': true,
      '../tabs/TabPanel': true,
    });
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('panel dialog title', () => {
    it("sets sidebar panel dialog title to include group's name", () => {
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in Test Private Group',
      );
    });

    it('sets a temporary title if focused group not available', () => {
      fakeStore.focusedGroup = sinon.stub().returns({});

      const wrapper = createComponent();
      assert.equal(
        wrapper.find('SidebarPanel').prop('title'),
        'Share Annotations in ...',
      );
    });
  });

  function selectTab(wrapper, name) {
    wrapper.find(`button[aria-controls="${name}-panel"]`).simulate('click');
  }

  function getActiveTab(wrapper) {
    return wrapper.find(Tab).filter({ selected: true });
  }

  function activeTabPanel(wrapper) {
    return wrapper.find('TabPanel').filter({ active: true });
  }

  it('shows correct tab panel when each tab is clicked', () => {
    const wrapper = createComponent();

    selectTab(wrapper, 'export');
    let selectedTab = getActiveTab(wrapper);
    assert.equal(selectedTab.text(), 'Export');
    assert.equal(selectedTab.props()['aria-controls'], 'export-panel');
    assert.equal(activeTabPanel(wrapper).props().id, 'export-panel');

    selectTab(wrapper, 'import');
    selectedTab = getActiveTab(wrapper);
    assert.equal(selectedTab.text(), 'Import');
    assert.equal(selectedTab.props()['aria-controls'], 'import-panel');
    assert.equal(activeTabPanel(wrapper).props().id, 'import-panel');

    selectTab(wrapper, 'share');
    assert.equal(activeTabPanel(wrapper).props().id, 'share-panel');
  });

  describe('a11y', () => {
    it(
      'should pass a11y checks',
      checkAccessibility({
        content: () => <ShareDialog shareTab />,
      }),
    );
  });
});
