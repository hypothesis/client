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
    mount(<ShareDialog shareTab exportTab importTab {...props} />);

  beforeEach(() => {
    fakeStore = {
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
    };

    $imports.$mock(mockImportedComponents());
    // Don't mock these related components for now
    $imports.$restore({
      './TabHeader': true,
      './TabPanel': true,
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

  it('does not render a tabbed dialog if only share tab is provided', () => {
    const wrapper = createComponent({ exportTab: false, importTab: false });

    assert.isFalse(wrapper.find('TabHeader').exists());
  });

  [{ importTab: false }, { exportTab: false }, {}].forEach(props => {
    it(`renders a tabbed dialog when more than one tab is provided`, () => {
      const wrapper = createComponent(props);

      assert.isTrue(wrapper.find('TabHeader').exists());
      assert.isTrue(
        wrapper.find(Tab).filter('[aria-controls="share-panel"]').props()
          .selected,
      );
      assert.isTrue(wrapper.find('TabPanel[id="share-panel"]').props().active);
    });
  });

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

  it('renders empty if no tabs should be displayed', () => {
    const wrapper = createComponent({
      shareTab: false,
      exportTab: false,
      importTab: false,
    });

    assert.isFalse(wrapper.exists('TabHeader'));
    assert.isFalse(wrapper.exists('ShareAnnotations'));
  });

  describe('a11y', () => {
    it(
      'should pass a11y checks',
      checkAccessibility({
        content: () =>
          // ShareDialog renders a Fragment as its top-level component when
          // it has import and/or export tabs.
          // Wrapping it in a `div` ensures `checkAccessibility` internal logic
          // does not discard all the Fragment children but the first one.
          // See https://github.com/hypothesis/client/issues/5671
          mount(
            <div>
              <ShareDialog shareTab exportTab importTab />
            </div>,
          ),
      }),
    );
  });
});
