import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import { mockImportedComponents } from '../../../../test-util/mock-imported-components';
import ShareDialog from '../ShareDialog';
import { $imports } from '../ShareDialog';

describe('ShareDialog', () => {
  let fakeStore;

  const fakePrivateGroup = {
    type: 'private',
    name: 'Test Private Group',
    id: 'testprivate',
  };

  const createComponent = () => mount(<ShareDialog />);

  beforeEach(() => {
    fakeStore = {
      focusedGroup: sinon.stub().returns(fakePrivateGroup),
      isFeatureEnabled: sinon.stub().returns(false),
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

  function enableFeature(feature) {
    fakeStore.isFeatureEnabled.withArgs(feature).returns(true);
  }

  function selectTab(wrapper, name) {
    wrapper
      .find(`Tab[aria-controls="${name}-panel"]`)
      .find('button')
      .simulate('click');
  }

  function getActiveTab(wrapper) {
    return wrapper.find('Tab').filter({ selected: true });
  }

  function activeTabPanel(wrapper) {
    return wrapper.find('TabPanel').filter({ active: true });
  }

  it('does not render a tabbed dialog if import/export feature flags are not enabled', () => {
    const wrapper = createComponent();

    assert.isFalse(wrapper.find('TabHeader').exists());
  });

  ['export_annotations', 'import_annotations'].forEach(feature => {
    it(`renders a tabbed dialog when ${feature} feature is enabled`, () => {
      enableFeature('export_annotations');

      const wrapper = createComponent();

      assert.isTrue(wrapper.find('TabHeader').exists());
      assert.isTrue(
        wrapper.find('Tab[aria-controls="share-panel"]').props().selected,
      );
      assert.isTrue(wrapper.find('TabPanel[id="share-panel"]').props().active);
    });
  });

  it('shows correct tab panel when each tab is clicked', () => {
    enableFeature('export_annotations');
    enableFeature('import_annotations');

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
    beforeEach(() => {
      enableFeature('export_annotations');
      enableFeature('import_annotations');
    });

    it(
      'should pass a11y checks',
      checkAccessibility({
        content: () =>
          // ShareDialog renders a Fragment as its top-level component when
          // `export_annotations` feature is enabled.
          // Wrapping it in a `div` ensures `checkAccessibility` internal logic
          // does not discard all the Fragment children but the first one.
          // See https://github.com/hypothesis/client/issues/5671
          mount(
            <div>
              <ShareDialog />
            </div>,
          ),
      }),
    );
  });
});
