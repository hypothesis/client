'use strict';

const $ = require('jquery');

const Toolbar = require('../toolbar');

describe('Toolbar', () => {
  let container;

  /**
   * Fake implementation of the `annotator` property of the toolbar instance.
   */
  let fakeAnnotator;
  let currentToolbar;

  function createToolbar() {
    const toolbar = new Toolbar(container);
    toolbar.annotator = fakeAnnotator;
    toolbar.pluginInit();

    currentToolbar = toolbar;

    return toolbar;
  }

  function findButton(toolbar, title) {
    return toolbar.element[0].querySelector(`[title="${title}"]`);
  }

  function isPressed(button) {
    return button.getAttribute('aria-pressed') === 'true';
  }

  beforeEach(() => {
    // The toolbar currently relies on a bunch of not-obviously public
    // properties of the `Sidebar` instance, including the DOM structure :(
    fakeAnnotator = {
      createAnnotation: sinon.stub(),
      frame: $('<div class="annotator-collapsed"></div>'),
      hide: sinon.stub(),
      options: {
        showHighlights: 'always',
        openSidebar: false,
      },
      setAllVisibleHighlights: sinon.stub(),
      show: sinon.stub(),
      visibleHighlights: true,
    };

    fakeAnnotator.show.callsFake(() =>
      fakeAnnotator.frame.removeClass('annotator-collapsed')
    );
    fakeAnnotator.hide.callsFake(() =>
      fakeAnnotator.frame.addClass('annotator-collapsed')
    );
    fakeAnnotator.setAllVisibleHighlights.callsFake(state => {
      fakeAnnotator.visibleHighlights = state;
      currentToolbar.publish('setVisibleHighlights', state);
    });

    container = document.createElement('div');
  });

  afterEach(() => {
    container.remove();
  });

  it('shows button for opening and closing sidebar', () => {
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'Toggle or Resize Sidebar');
    assert.ok(button, 'open/close toggle button not found');
    assert.isFalse(isPressed(button));

    button.click();
    assert.called(fakeAnnotator.show);
    assert.isTrue(isPressed(button));

    button.click();
    assert.called(fakeAnnotator.hide);
    assert.isFalse(isPressed(button));
  });

  // nb. The "Close Sidebar" button is only shown when using the "Clean" theme.
  it('shows button for closing the sidebar', () => {
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'Close Sidebar');

    button.click();
    assert.called(fakeAnnotator.hide);
  });

  it('shows open/close toggle button as pressed if sidebar is open on startup', () => {
    fakeAnnotator.options.openSidebar = true;
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'Toggle or Resize Sidebar');
    assert.isTrue(isPressed(button));
  });

  it('shows button for toggling highlight visibility', () => {
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'Toggle Highlights Visibility');
    assert.ok(button, 'highlight visibility toggle button not found');
    assert.isTrue(isPressed(button));

    button.click();
    assert.calledWith(fakeAnnotator.setAllVisibleHighlights, false);
    assert.isFalse(isPressed(button));

    button.click();
    assert.calledWith(fakeAnnotator.setAllVisibleHighlights, true);
    assert.isTrue(isPressed(button));
  });

  it('shows highlight button as un-pressed if highlights are hidden on startup', () => {
    fakeAnnotator.options.showHighlights = 'never';
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'Toggle Highlights Visibility');
    assert.isFalse(isPressed(button));
  });

  it('shows button for creating new page notes', () => {
    const toolbar = createToolbar();
    const button = findButton(toolbar, 'New Page Note');
    assert.ok(button, 'page note button not found');

    button.click();

    assert.called(fakeAnnotator.createAnnotation);
    assert.called(fakeAnnotator.show);
  });
});
