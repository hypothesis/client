import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

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

  describe('tabbed dialog panel', () => {
    it('does not render a tabbed dialog if export feature flag is not enabled', () => {
      const wrapper = createComponent();

      assert.isFalse(wrapper.find('TabHeader').exists());
    });

    context('export feature enabled', () => {
      beforeEach(() => {
        fakeStore.isFeatureEnabled.withArgs('export_annotations').returns(true);
      });

      it('renders a tabbed dialog with share panel active', () => {
        const wrapper = createComponent();

        assert.isTrue(wrapper.find('TabHeader').exists());
        assert.isTrue(
          wrapper.find('Tab[aria-controls="share-panel"]').props().selected,
        );
        assert.isTrue(
          wrapper.find('TabPanel[id="share-panel"]').props().active,
        );
      });

      it('shows the export tab panel when export tab clicked', () => {
        const wrapper = createComponent();
        const shareTabSelector = 'Tab[aria-controls="share-panel"]';
        const exportTabSelector = 'Tab[aria-controls="export-panel"]';

        act(() => {
          wrapper
            .find(exportTabSelector)
            .getDOMNode()
            .dispatchEvent(new Event('click'));
        });
        wrapper.update();

        const selectedTab = wrapper.find('Tab').filter({ selected: true });
        assert.equal(selectedTab.text(), 'Export');
        assert.equal(selectedTab.props()['aria-controls'], 'export-panel');

        const activeTabPanel = wrapper
          .find('TabPanel')
          .filter({ active: true });
        assert.equal(activeTabPanel.props().id, 'export-panel');

        // Now, reselect share tab
        act(() => {
          wrapper
            .find(shareTabSelector)
            .getDOMNode()
            .dispatchEvent(new Event('click'));
        });
        wrapper.update();

        const shareTabPanel = wrapper.find('TabPanel').filter({ active: true });
        assert.equal(shareTabPanel.props().id, 'share-panel');
      });
    });
  });

  describe('a11y', () => {
    beforeEach(() => {
      fakeStore.isFeatureEnabled.withArgs('export_annotations').returns(true);
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
