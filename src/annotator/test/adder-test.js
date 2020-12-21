import { act } from 'preact/test-utils';
import { createElement } from 'preact';
import { mount } from 'enzyme';

import {
  Adder,
  ARROW_POINTING_UP,
  ARROW_POINTING_DOWN,
  $imports,
} from '../adder';

function rect(left, top, width, height) {
  return { left, top, width, height };
}

/**
 * Offset an `Element` from its default position.
 */
function offsetElement(el) {
  el.style.position = 'relative';
  el.style.left = '-200px';
  el.style.top = '-200px';
}

/**
 * Reset an element back to its default position.
 */
function revertOffsetElement(el) {
  el.style.position = 'static';
  el.style.left = '0';
  el.style.top = '0';
}

// nb. These tests currently cover the `AdderToolbar` Preact component as well
// as the `Adder` container. The tests for `AdderToolbar` should be moved into
// `adder-toolbar-test.js`.
describe('Adder', () => {
  let adderCtrl;
  let adderCallbacks;
  let adderEl;

  beforeEach(() => {
    adderCallbacks = {
      onAnnotate: sinon.stub(),
      onHighlight: sinon.stub(),
      onShowAnnotations: sinon.stub(),
    };
    adderEl = document.createElement('div');
    adderEl.label = 'adder-container';
    document.body.appendChild(adderEl);

    adderCtrl = new Adder(adderEl, adderCallbacks);
  });

  afterEach(() => {
    adderCtrl.hide();
    adderEl.remove();
    $imports.$restore();
  });

  function windowSize() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function getContent() {
    return adderCtrl._shadowRoot;
  }

  function adderSize() {
    const rect = getContent(adderCtrl).firstChild.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  it('renders the adder toolbar into a shadow root', () => {
    const adderEl = document.createElement('div');
    let shadowEl;

    adderEl.attachShadow = sinon.spy(() => {
      shadowEl = document.createElement('shadow-root');
      adderEl.appendChild(shadowEl);
      return shadowEl;
    });
    document.body.appendChild(adderEl);

    new Adder(adderEl, adderCallbacks);

    assert.called(adderEl.attachShadow);
    assert.equal(
      shadowEl.childNodes[0].tagName.toLowerCase(),
      'hypothesis-adder-toolbar'
    );

    adderEl.remove();
  });

  describe('button handling', () => {
    const getButton = label =>
      getContent(adderCtrl).querySelector(`button[title^="${label}"]`);

    const triggerShortcut = key =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key }));

    const showAdder = () => {
      // nb. `act` is necessary here to flush effect hooks in `AdderToolbar`
      // which setup shortcut handlers.
      act(() => {
        adderCtrl.show(rect(100, 200, 100, 20), false);
      });
    };

    it('calls onHighlight callback when Highlight button is clicked', () => {
      const highlightBtn = getButton('Highlight');
      highlightBtn.dispatchEvent(new Event('click'));
      assert.called(adderCallbacks.onHighlight);
    });

    it('calls onAnnotate callback when Annotate button is clicked', () => {
      const annotateBtn = getButton('Annotate');
      annotateBtn.dispatchEvent(new Event('click'));
      assert.called(adderCallbacks.onAnnotate);
    });

    it('does not show "Show" button if the selection has no annotations', () => {
      showAdder();
      assert.isNull(getButton('Show'));
    });

    it('shows the "Show" button if the selection has annotations', () => {
      adderCtrl.annotationsForSelection = ['ann1', 'ann2'];
      showAdder();

      const showBtn = getButton('Show');
      assert.ok(showBtn, '"Show" button not visible');
      assert.equal(showBtn.querySelector('span').textContent, '2');
    });

    it('calls onShowAnnotations callback when Show button is clicked', () => {
      adderCtrl.annotationsForSelection = ['ann1'];
      showAdder();
      const showBtn = getButton('Show');

      showBtn.click();

      assert.called(adderCallbacks.onShowAnnotations);
      assert.calledWith(adderCallbacks.onShowAnnotations, ['ann1']);
    });

    it("calls onAnnotate callback when Annotate button's label is clicked", () => {
      const annotateLabel = getContent(adderCtrl).querySelector(
        'button[title^="Annotate"] > span'
      );
      annotateLabel.dispatchEvent(new Event('click', { bubbles: true }));
      assert.called(adderCallbacks.onAnnotate);
    });

    it('calls onAnnotate callback when shortcut is pressed if adder is visible', () => {
      showAdder();
      triggerShortcut('a');
      assert.called(adderCallbacks.onAnnotate);
    });

    it('calls onHighlight callback when shortcut is pressed if adder is visible', () => {
      showAdder();
      triggerShortcut('h');
      assert.called(adderCallbacks.onHighlight);
    });

    it('calls onShowAnnotations callback when shortcut is pressed if adder is visible', () => {
      adderCtrl.annotationsForSelection = ['ann1'];
      showAdder();
      triggerShortcut('s');
      assert.called(adderCallbacks.onShowAnnotations);
    });

    it('does not call callbacks when adder is hidden', () => {
      triggerShortcut('a');
      triggerShortcut('h');
      triggerShortcut('s');

      assert.notCalled(adderCallbacks.onAnnotate);
      assert.notCalled(adderCallbacks.onHighlight);
      assert.notCalled(adderCallbacks.onShowAnnotations);
    });
  });

  describe('#_calculateTarget', () => {
    it('positions the adder below the selection if the selection is forwards', () => {
      const target = adderCtrl._calculateTarget(rect(100, 200, 100, 20), false);
      assert.isAbove(target.top, 220);
      assert.equal(target.arrowDirection, ARROW_POINTING_UP);
    });

    it('positions the adder above the selection if the selection is backwards', () => {
      const target = adderCtrl._calculateTarget(rect(100, 200, 100, 20), true);
      assert.isBelow(target.top, 200);
      assert.equal(target.arrowDirection, ARROW_POINTING_DOWN);
    });

    it('does not position the adder above the top of the viewport', () => {
      const target = adderCtrl._calculateTarget(
        rect(100, -100, 100, 20),
        false
      );
      assert.isAtLeast(target.top, 0);
      assert.equal(target.arrowDirection, ARROW_POINTING_UP);
    });

    it('does not position the adder above the top of the viewport even when selection is backwards', () => {
      const target = adderCtrl._calculateTarget(rect(100, -100, 100, 20), true);
      assert.isAtLeast(target.top, 0);
      assert.equal(target.arrowDirection, ARROW_POINTING_UP);
    });

    it('does not position the adder below the bottom of the viewport', () => {
      const viewSize = windowSize();
      const target = adderCtrl._calculateTarget(
        rect(0, viewSize.height + 100, 10, 20),
        false
      );
      assert.isAtMost(target.top, viewSize.height - adderSize().height);
    });

    it('does not position the adder beyond the right edge of the viewport', () => {
      const viewSize = windowSize();
      const target = adderCtrl._calculateTarget(
        rect(viewSize.width + 100, 100, 10, 20),
        false
      );
      assert.isAtMost(target.left, viewSize.width);
    });

    it('does not positon the adder beyond the left edge of the viewport', () => {
      const target = adderCtrl._calculateTarget(rect(-100, 100, 10, 10), false);
      assert.isAtLeast(target.left, 0);
    });

    context('touch device', () => {
      it('positions the adder below the selection even if the selection is backwards', () => {
        $imports.$mock({
          '../shared/user-agent': {
            isTouchDevice: sinon.stub().returns(true),
          },
        });
        const target = adderCtrl._calculateTarget(
          rect(100, 200, 100, 20),
          true
        );
        assert.isAbove(target.top, 220);
        assert.equal(target.arrowDirection, ARROW_POINTING_UP);
      });
    });
  });

  describe('adder Z index', () => {
    let container;

    function getAdderZIndex(left, top) {
      adderCtrl._showAt(left, top);
      return parseInt(adderEl.style.zIndex);
    }

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('returns default hard coded value if `document.elementsFromPoint` is not available', () => {
      const elementsFromPointBackup = document.elementsFromPoint;
      document.elementsFromPoint = undefined;
      assert.strictEqual(getAdderZIndex(0, 0), 32768);
      document.elementsFromPoint = elementsFromPointBackup;
    });

    it('returns default value of 1', () => {
      // Even if not elements are found, it returns 1
      assert.strictEqual(getAdderZIndex(-100000, -100000), 1);
      assert.strictEqual(getAdderZIndex(100000, 100000), 1);
    });

    it('returns the greatest zIndex', () => {
      const createComponent = (left, top, zIndex, attachTo) =>
        mount(
          <div
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              left,
              top,
              zIndex,
            }}
          />,
          { attachTo }
        );

      const wrapper = createComponent(0, 0, 2, container);
      assert.strictEqual(getAdderZIndex(0, 0), 3);

      const initLeft = 10;
      const initTop = 10;
      const adderWidth = adderCtrl._width();
      const adderHeight = adderCtrl._height();
      const wrapperDOMNode = wrapper.getDOMNode();

      // Create first element (left-top)
      createComponent(initLeft, initTop, 3, wrapperDOMNode);
      assert.strictEqual(getAdderZIndex(initLeft, initTop), 4);

      // Create second element (left-bottom)
      createComponent(initLeft, initTop + adderHeight, 5, wrapperDOMNode);
      assert.strictEqual(getAdderZIndex(initLeft, initTop), 6);

      // Create third element (middle-center)
      createComponent(
        initLeft + adderWidth / 2,
        initTop + adderHeight / 2,
        6,
        wrapperDOMNode
      );
      assert.strictEqual(getAdderZIndex(initLeft, initTop), 7);

      // Create fourth element (right-top)
      createComponent(initLeft + adderWidth, initTop, 7, wrapperDOMNode);
      assert.strictEqual(getAdderZIndex(initLeft, initTop), 8);

      // Create third element (right-bottom)
      createComponent(
        initLeft + adderWidth,
        initTop + adderHeight,
        8,
        wrapperDOMNode
      );
      assert.strictEqual(getAdderZIndex(initLeft, initTop), 9);

      wrapper.unmount();
    });
  });

  describe('#_showAt', () => {
    context('when the document and body elements have no offset', () => {
      it('shows adder at target position', () => {
        adderCtrl._showAt(100, 100, ARROW_POINTING_UP);

        const { left, top } = adderEl.getBoundingClientRect();
        assert.equal(left, 100);
        assert.equal(top, 100);
      });
    });

    context('when the body element is offset', () => {
      beforeEach(() => {
        offsetElement(document.body);
      });

      afterEach(() => {
        revertOffsetElement(document.body);
      });

      it('shows adder at target position', () => {
        adderCtrl._showAt(100, 100, ARROW_POINTING_UP);

        const { left, top } = adderEl.getBoundingClientRect();
        assert.equal(left, 100);
        assert.equal(top, 100);
      });
    });

    context('when the document element is offset', () => {
      beforeEach(() => {
        offsetElement(document.documentElement);
      });

      afterEach(() => {
        revertOffsetElement(document.documentElement);
      });

      it('shows adder at target position when document element is offset', () => {
        adderCtrl._showAt(100, 100, ARROW_POINTING_UP);

        const { left, top } = adderEl.getBoundingClientRect();
        assert.equal(left, 100);
        assert.equal(top, 100);
      });
    });
  });

  describe('#show', () => {
    it('shows the container in the correct location', () => {
      adderCtrl.show(rect(100, 200, 100, 20), false);
      const adder = document.elementFromPoint(150, 250);
      assert.strictEqual(adder.label, 'adder-container');
      assert.isTrue(+adder.style.zIndex > 0);

      adderCtrl.show(rect(200, 100, 100, 20), false);
      assert.strictEqual(
        document.elementFromPoint(250, 150).label,
        'adder-container'
      );
    });
  });
});
