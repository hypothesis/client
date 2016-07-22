'use strict';

var classnames = require('classnames');

var template = require('./adder.html');

/**
 * Show the adder above the selection with an arrow pointing down at the
 * selected text.
 */
var ARROW_POINTING_DOWN = 1;

/**
 * Show the adder above the selection with an arrow pointing up at the
 * selected text.
 */
var ARROW_POINTING_UP = 2;

function toPx(pixels) {
  return pixels.toString() + 'px';
}

var ARROW_HEIGHT = 10;

// The preferred gap between the end of the text selection and the adder's
// arrow position.
var ARROW_H_MARGIN = 20;

/**
 * Annotation 'adder' toolbar which appears next to the selection
 * and provides controls for the user to create new annotations.
 *
 * @param {Element} container - The DOM element into which the adder will be created
 * @param {Object} options - Options object specifying `onAnnotate` and `onHighlight`
 *        event handlers.
 */
function Adder(container, options) {

  container.innerHTML = template;
  var element = container.querySelector('.js-adder');

  Object.assign(container.style, {
    // Set initial style. The adder is hidden using the `visibility`
    // property rather than `display` so that we can compute its size in order to
    // position it before display.
    display: 'block',
    position: 'absolute',
    visibility: 'hidden',

    // Assign a high Z-index so that the adder shows above any content on the
    // page
    zIndex: 999,
  });

  this.element = element;

  var view = element.ownerDocument.defaultView;
  var enterTimeout;

  element.querySelector('.js-annotate-btn')
         .addEventListener('click', handleCommand.bind(this, 'annotate'));
  element.querySelector('.js-highlight-btn')
         .addEventListener('click', handleCommand.bind(this, 'highlight'));

  function handleCommand(command, event) {
    event.preventDefault();
    event.stopPropagation();

    if (command === 'annotate') {
      options.onAnnotate();
    } else {
      options.onHighlight();
    }

    this.hide();
  }

  function width() {
    return element.getBoundingClientRect().width;
  }

  function height() {
    return element.getBoundingClientRect().height;
  }

  /** Hide the adder */
  this.hide = function () {
    clearTimeout(enterTimeout);
    element.className = classnames({'annotator-adder': true});
    container.style.visibility = 'hidden';
  };

  /**
   * Return the best position to show the adder in order to target the
   * selected text in `targetRect`.
   *
   * @param {Rect} targetRect - The rect of text to target, in document
   *        coordinates.
   * @param {boolean} isSelectionBackwards - True if the selection was made
   *        backwards, such that the focus point is mosty likely at the top-left
   *        edge of `targetRect`.
   */
  this.target = function (targetRect, isSelectionBackwards) {
    // Set the initial arrow direction based on whether the selection was made
    // forwards/upwards or downwards/backwards.
    var arrowDirection;
    if (isSelectionBackwards) {
      arrowDirection = ARROW_POINTING_DOWN;
    } else {
      arrowDirection = ARROW_POINTING_UP;
    }
    var top;
    var left;

    // Position the adder such that the arrow it is above or below the selection
    // and close to the end.
    var hMargin = Math.min(ARROW_H_MARGIN, targetRect.width);
    if (isSelectionBackwards) {
      left = targetRect.left - width() / 2 + hMargin;
    } else {
      left = targetRect.left + targetRect.width - width() / 2 - hMargin;
    }

    // Flip arrow direction if adder would appear above the top or below the
    // bottom of the viewport.
    //
    // Note: `pageYOffset` is used instead of `scrollY` here for IE
    // compatibility
    if (targetRect.top - height() < view.pageYOffset &&
        arrowDirection === ARROW_POINTING_DOWN) {
      arrowDirection = ARROW_POINTING_UP;
    } else if (targetRect.top + height() > view.pageYOffset + view.innerHeight) {
      arrowDirection = ARROW_POINTING_DOWN;
    }

    if (arrowDirection === ARROW_POINTING_UP) {
      top = targetRect.top + targetRect.height + ARROW_HEIGHT;
    } else {
      top = targetRect.top - height() - ARROW_HEIGHT;
    }

    // Constrain the adder to the viewport.
    left = Math.max(left, view.pageXOffset);
    left = Math.min(left, view.pageXOffset + view.innerWidth - width());

    top = Math.max(top, view.pageYOffset);
    top = Math.min(top, view.pageYOffset + view.innerHeight - height());

    return {top: top, left: left, arrowDirection: arrowDirection};
  };

  /**
   * Show the adder at the given position and with the arrow pointing in
   * `arrowDirection`.
   */
  this.showAt = function (left, top, arrowDirection) {
    element.className = classnames({
      'annotator-adder': true,
      'annotator-adder--arrow-down': arrowDirection === ARROW_POINTING_DOWN,
      'annotator-adder--arrow-up': arrowDirection === ARROW_POINTING_UP,
    });

    Object.assign(container.style, {
      top: toPx(top),
      left: toPx(left),
      visibility: 'visible',
    });

    clearTimeout(enterTimeout);
    enterTimeout = setTimeout(function () {
      element.className += ' is-active';
    }, 1);
  };
}

module.exports = {
  ARROW_POINTING_DOWN: ARROW_POINTING_DOWN,
  ARROW_POINTING_UP: ARROW_POINTING_UP,

  Adder: Adder,
};
