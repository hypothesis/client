'use strict';

const classnames = require('classnames');

const template = require('./adder.html');

const i18nService = require('../sidebar/services/i18nService')();

const ANNOTATE_BTN_SELECTOR = '.js-annotate-btn';
const HIGHLIGHT_BTN_SELECTOR = '.js-highlight-btn';

/**
 * @typedef Target
 * @prop {number} left - Offset from left edge of viewport.
 * @prop {number} top - Offset from top edge of viewport.
 * @prop {number} arrowDirection - Direction of the adder's arrow.
 */

/**
 * Show the adder above the selection with an arrow pointing down at the
 * selected text.
 */
const ARROW_POINTING_DOWN = 1;

/**
 * Show the adder above the selection with an arrow pointing up at the
 * selected text.
 */
const ARROW_POINTING_UP = 2;

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const ARROW_HEIGHT = 10;

// The preferred gap between the end of the text selection and the adder's
// arrow position.
const ARROW_H_MARGIN = 20;

function attachShadow(element) {
  if (element.attachShadow) {
    // Shadow DOM v1 (Chrome v53, Safari 10)
    return element.attachShadow({ mode: 'open' });
  } else if (element.createShadowRoot) {
    // Shadow DOM v0 (Chrome ~35-52)
    return element.createShadowRoot();
  } else {
    return null;
  }
}

/**
 * Return the closest ancestor of `el` which has been positioned.
 *
 * If no ancestor has been positioned, returns the root element.
 *
 * @param {Element} el
 * @return {Element}
 */
function nearestPositionedAncestor(el) {
  let parentEl = el.parentElement;
  while (parentEl.parentElement) {
    if (getComputedStyle(parentEl).position !== 'static') {
      break;
    }
    parentEl = parentEl.parentElement;
  }
  return parentEl;
}

/**
 * Create the DOM structure for the Adder.
 *
 * Returns the root DOM node for the adder, which may be in a shadow tree.
 */
function createAdderDOM(container) {
  let element;

  // If the browser supports Shadow DOM, use it to isolate the adder
  // from the page's CSS
  //
  // See https://developers.google.com/web/fundamentals/primers/shadowdom/
  const shadowRoot = attachShadow(container);
  if (shadowRoot) {
    shadowRoot.innerHTML = template;
    element = shadowRoot.querySelector('.js-adder');

    // Load stylesheets required by adder into shadow DOM element
    const adderStyles = Array.from(document.styleSheets)
      .map(function(sheet) {
        return sheet.href;
      })
      .filter(function(url) {
        return (url || '').match(/(icomoon|annotator)\.css/);
      });

    // Stylesheet <link> elements are inert inside shadow roots [1]. Until
    // Shadow DOM implementations support external stylesheets [2], grab the
    // relevant CSS files from the current page and `@import` them.
    //
    // [1] http://stackoverflow.com/questions/27746590
    // [2] https://github.com/w3c/webcomponents/issues/530
    //
    // This will unfortunately break if the page blocks inline stylesheets via
    // CSP, but that appears to be rare and if this happens, the user will still
    // get a usable adder, albeit one that uses browser default styles for the
    // toolbar.
    const styleEl = document.createElement('style');
    styleEl.textContent = adderStyles
      .map(function(url) {
        return '@import "' + url + '";';
      })
      .join('\n');
    shadowRoot.appendChild(styleEl);
  } else {
    container.innerHTML = template;
    element = container.querySelector('.js-adder');
  }
  return element;
}

function loadCaptions(element) {
    const captionElems = element.querySelectorAll('.caption');
    Array.from(captionElems).forEach(function(elem) {
      elem.textContent = i18nService.tl(elem.textContent);
    });
}

/**
 * Annotation 'adder' toolbar which appears next to the selection
 * and provides controls for the user to create new annotations.
 */
class Adder {
  /**
   * Construct the toolbar and populate the UI.
   *
   * The adder is initially hidden.
   *
   * @param {Element} container - The DOM element into which the adder will be created
   * @param {Object} options - Options object specifying `onAnnotate` and `onHighlight`
   *        event handlers.
   */
  constructor(container, options) {
    i18nService.initI18n();
    this.element = createAdderDOM(container);
    this._container = container;

    // Load captions using i18nService.
    loadCaptions(this.element);

    // Set initial style
    Object.assign(container.style, {
      display: 'block',

      // take position out of layout flow initially
      position: 'absolute',
      top: 0,

      // Assign a high Z-index so that the adder shows above any content on the
      // page
      zIndex: 999,
    });

    // The adder is hidden using the `visibility` property rather than `display`
    // so that we can compute its size in order to position it before display.
    this.element.style.visibility = 'hidden';

    this._view = this.element.ownerDocument.defaultView;
    this._enterTimeout = null;

    const handleCommand = (event, callback) => {
      event.preventDefault();
      event.stopPropagation();

      callback();

      this.hide();
    };

    this.element
      .querySelector(ANNOTATE_BTN_SELECTOR)
      .addEventListener('click', event =>
        handleCommand(event, options.onAnnotate)
      );
    this.element
      .querySelector(HIGHLIGHT_BTN_SELECTOR)
      .addEventListener('click', event =>
        handleCommand(event, options.onHighlight)
      );

    this._width = () => this.element.getBoundingClientRect().width;
    this._height = () => this.element.getBoundingClientRect().height;
  }

  /** Hide the adder */
  hide() {
    clearTimeout(this._enterTimeout);
    this.element.className = classnames({ 'annotator-adder': true });
    this.element.style.visibility = 'hidden';
  }

  /**
   * Return the best position to show the adder in order to target the
   * selected text in `targetRect`.
   *
   * @param {Rect} targetRect - The rect of text to target, in viewport
   *        coordinates.
   * @param {boolean} isSelectionBackwards - True if the selection was made
   *        backwards, such that the focus point is mosty likely at the top-left
   *        edge of `targetRect`.
   * @return {Target}
   */
  target(targetRect, isSelectionBackwards) {
    // Set the initial arrow direction based on whether the selection was made
    // forwards/upwards or downwards/backwards.
    let arrowDirection;
    if (isSelectionBackwards) {
      arrowDirection = ARROW_POINTING_DOWN;
    } else {
      arrowDirection = ARROW_POINTING_UP;
    }
    let top;
    let left;

    // Position the adder such that the arrow it is above or below the selection
    // and close to the end.
    const hMargin = Math.min(ARROW_H_MARGIN, targetRect.width);
    if (isSelectionBackwards) {
      left = targetRect.left - this._width() / 2 + hMargin;
    } else {
      left = targetRect.left + targetRect.width - this._width() / 2 - hMargin;
    }

    // Flip arrow direction if adder would appear above the top or below the
    // bottom of the viewport.
    if (
      targetRect.top - this._height() < 0 &&
      arrowDirection === ARROW_POINTING_DOWN
    ) {
      arrowDirection = ARROW_POINTING_UP;
    } else if (targetRect.top + this._height() > this._view.innerHeight) {
      arrowDirection = ARROW_POINTING_DOWN;
    }

    if (arrowDirection === ARROW_POINTING_UP) {
      top = targetRect.top + targetRect.height + ARROW_HEIGHT;
    } else {
      top = targetRect.top - this._height() - ARROW_HEIGHT;
    }

    // Constrain the adder to the viewport.
    left = Math.max(left, 0);
    left = Math.min(left, this._view.innerWidth - this._width());

    top = Math.max(top, 0);
    top = Math.min(top, this._view.innerHeight - this._height());

    return { top, left, arrowDirection };
  }

  /**
   * Show the adder at the given position and with the arrow pointing in
   * `arrowDirection`.
   *
   * @param {number} left - Horizontal offset from left edge of viewport.
   * @param {number} top - Vertical offset from top edge of viewport.
   */
  showAt(left, top, arrowDirection) {
    this.element.className = classnames({
      'annotator-adder': true,
      'annotator-adder--arrow-down': arrowDirection === ARROW_POINTING_DOWN,
      'annotator-adder--arrow-up': arrowDirection === ARROW_POINTING_UP,
    });

    // Some sites make big assumptions about interactive
    // elements on the page. Some want to hide interactive elements
    // after use. So we need to make sure the button stays displayed
    // the way it was originally displayed - without the inline styles
    // See: https://github.com/hypothesis/client/issues/137
    this.element.querySelector(ANNOTATE_BTN_SELECTOR).style.display = '';
    this.element.querySelector(HIGHLIGHT_BTN_SELECTOR).style.display = '';

    // Translate the (left, top) viewport coordinates into positions relative to
    // the adder's nearest positioned ancestor (NPA).
    //
    // Typically the adder is a child of the `<body>` and the NPA is the root
    // `<html>` element. However page styling may make the `<body>` positioned.
    // See https://github.com/hypothesis/client/issues/487.
    const positionedAncestor = nearestPositionedAncestor(this._container);
    const parentRect = positionedAncestor.getBoundingClientRect();

    Object.assign(this._container.style, {
      top: toPx(top - parentRect.top),
      left: toPx(left - parentRect.left),
    });
    this.element.style.visibility = 'visible';

    clearTimeout(this._enterTimeout);
    this._enterTimeout = setTimeout(() => {
      this.element.className += ' is-active';
    }, 1);
  }
}

module.exports = {
  ARROW_POINTING_DOWN: ARROW_POINTING_DOWN,
  ARROW_POINTING_UP: ARROW_POINTING_UP,

  Adder: Adder,
};
