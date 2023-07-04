import { mount } from 'enzyme';

import AdderToolbar from '../AdderToolbar';

// nb. Most tests for `AdderToolbar` are currently covered by `adder-test.js`.
// This needs refactoring to test the `AdderToolbar` on its own as a unit.
describe('AdderToolbar', () => {
  const createComponent = props =>
    mount(
      <AdderToolbar
        direction="up"
        onCommand={() => {}}
        isVisible={true}
        {...props}
      />
    );

  describe('keyboard shortcut content for screen readers', () => {
    it('renders keyboard shortcuts for annotate and highlight actions', () => {
      const wrapper = createComponent();
      const shortcutListItems = wrapper
        .find('[data-testid="annotate-shortcuts-announce"]')
        .find('li');

      assert.equal(shortcutListItems.length, 2);
      assert.include(shortcutListItems.at(0).text(), 'annotate');
      assert.include(shortcutListItems.at(1).text(), 'highlight');
    });

    it('does not render keyboard shortcut items if adder is not visible', () => {
      const wrapper = createComponent({ isVisible: false });

      const shortcutListItems = wrapper
        .find('[data-testid="annotate-shortcuts-announce"]')
        .find('li');

      assert.equal(shortcutListItems.length, 0);
    });

    it('renders a keyboard shortcut to show annotations when there are annotations to show', () => {
      const wrapper = createComponent({ annotationCount: 2 });
      const shortcutListItems = wrapper
        .find('[data-testid="annotate-shortcuts-announce"]')
        .find('li');

      assert.equal(shortcutListItems.length, 3);
      assert.include(shortcutListItems.at(0).text(), 'show annotations');
    });

    it('renders status information about annotation count when there are annotations to show', () => {
      const wrapper = createComponent({ annotationCount: 2 });
      const annotationCountStatus = wrapper.find(
        '[data-testid="annotation-count-announce"]'
      );
      assert.include(annotationCountStatus.text(), '2 annotations');
    });

    it('does not render status information about annotation count when there are no annotations', () => {
      const wrapper = createComponent({ annotationCount: 0 });
      const annotationCountStatus = wrapper.find(
        '[data-testid="annotation-count-announce"]'
      );

      assert.isEmpty(annotationCountStatus.text());
    });
  });
});
