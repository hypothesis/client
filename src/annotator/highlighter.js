import { closest } from './util/dom';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function isCSSPropertySupported(property, value) {
  if (typeof CSS !== 'function' || typeof CSS.supports !== 'function') {
    /* istanbul ignore next */
    return false;
  }
  return CSS.supports(property, value);
}

/**
 * Return the canvas element underneath a highlight element in a PDF page's
 * text layer.
 *
 * Returns `null` if the highlight is not above a PDF canvas.
 *
 * @param {HTMLElement} highlightEl -
 *   A `<hypothesis-highlight>` element in the page's text layer
 * @return {HTMLCanvasElement|null}
 */
function getPdfCanvas(highlightEl) {
  // This code assumes that PDF.js renders pages with a structure like:
  //
  // <div class="page">
  //   <div class="canvasWrapper">
  //     <canvas></canvas> <!-- The rendered PDF page -->
  //   </div>
  //   <div class="textLayer">
  //      <!-- Transparent text layer with text spans used to enable text selection -->
  //   </div>
  // </div>
  //
  // It also assumes that the `highlightEl` element is somewhere under
  // the `.textLayer` div.

  const pageEl = closest(highlightEl, '.page');
  if (!pageEl) {
    return null;
  }

  const canvasEl = pageEl.querySelector('.canvasWrapper > canvas');
  if (!canvasEl) {
    return null;
  }

  return canvasEl;
}

/**
 * Draw highlights in an SVG layer overlaid on top of a PDF.js canvas.
 *
 * Returns `null` if `highlightEl` is not above a PDF.js page canvas.
 *
 * @param {HTMLElement} highlightEl -
 *   An element that wraps the highlighted text in the transparent text layer
 *   above the PDF.
 * @return {SVGElement|null} -
 *   The SVG graphic element that corresponds to the highlight or `null` if
 *   no PDF page was found below the highlight.
 */
function drawHighlightsAbovePdfCanvas(highlightEl) {
  const canvasEl = getPdfCanvas(highlightEl);
  if (!canvasEl) {
    return null;
  }

  let svgHighlightLayer = canvasEl.parentElement.querySelector(
    '.hypothesis-highlight-layer'
  );

  const isCssBlendSupported = isCSSPropertySupported(
    'mix-blend-mode',
    'multiply'
  );

  if (!svgHighlightLayer) {
    // Create SVG layer. This must be in the same stacking context as
    // the canvas so that CSS `mix-blend-mode` can be used to control how SVG
    // content blends with the canvas below.
    svgHighlightLayer = document.createElementNS(SVG_NAMESPACE, 'svg');
    svgHighlightLayer.setAttribute('class', 'hypothesis-highlight-layer');
    canvasEl.parentElement.appendChild(svgHighlightLayer);

    // Overlay SVG layer above canvas.
    canvasEl.parentElement.style.position = 'relative';

    const svgStyle = svgHighlightLayer.style;
    svgStyle.position = 'absolute';
    svgStyle.left = 0;
    svgStyle.top = 0;
    svgStyle.width = '100%';
    svgStyle.height = '100%';

    if (isCssBlendSupported) {
      // Use multiply blending so that highlights drawn on top of text darken it
      // rather than making it lighter. This improves contrast and thus readability
      // of highlighted text, especially for overlapping highlights.
      //
      // This choice optimizes for the common case of dark text on a light background.
      svgStyle.mixBlendMode = 'multiply';
    } else {
      // For older browsers (IE 11, Edge < 79) we draw all the highlights as
      // opaque and then make the entire highlight layer transparent. This means
      // that there is no visual indication of whether text has one or multiple
      // highlights, but it preserves readability.
      svgStyle.opacity = 0.3;
    }
  }

  const canvasRect = canvasEl.getBoundingClientRect();
  const highlightRect = highlightEl.getBoundingClientRect();

  // Create SVG element for the current highlight element.
  const rect = document.createElementNS(SVG_NAMESPACE, 'rect');
  rect.setAttribute('x', highlightRect.left - canvasRect.left);
  rect.setAttribute('y', highlightRect.top - canvasRect.top);
  rect.setAttribute('width', highlightRect.width);
  rect.setAttribute('height', highlightRect.height);

  if (isCssBlendSupported) {
    rect.setAttribute('class', 'hypothesis-svg-highlight');
  } else {
    rect.setAttribute('class', 'hypothesis-svg-highlight is-opaque');
  }

  svgHighlightLayer.appendChild(rect);

  return rect;
}

/**
 * Wraps the DOM Nodes within the provided range with a highlight
 * element of the specified class and returns the highlight Elements.
 *
 * @param {NormalizedRange} normedRange - Range to be highlighted.
 * @param {string} cssClass - A CSS class to use for the highlight
 * @return {HTMLElement[]} - Elements wrapping text in `normedRange` to add a highlight effect
 */
export function highlightRange(normedRange, cssClass = 'hypothesis-highlight') {
  const white = /^\s*$/;

  // Find text nodes within the range to highlight.
  const textNodes = normedRange.textNodes();

  // Check if this range refers to a placeholder for not-yet-rendered text in
  // a PDF. These highlights should be invisible.
  const isPlaceholder =
    textNodes.length > 0 &&
    closest(textNodes[0].parentNode, '.annotator-placeholder') !== null;

  // Group text nodes into spans of adjacent nodes. If a group of text nodes are
  // adjacent, we only need to create one highlight element for the group.
  let textNodeSpans = [];
  let prevNode = null;
  let currentSpan = null;

  textNodes.forEach(node => {
    if (prevNode && prevNode.nextSibling === node) {
      currentSpan.push(node);
    } else {
      currentSpan = [node];
      textNodeSpans.push(currentSpan);
    }
    prevNode = node;
  });

  // Filter out text node spans that consist only of white space. This avoids
  // inserting highlight elements in places that can only contain a restricted
  // subset of nodes such as table rows and lists.
  textNodeSpans = textNodeSpans.filter(span =>
    // Check for at least one text node with non-space content.
    span.some(node => !white.test(node.nodeValue))
  );

  // Wrap each text node span with a `<hypothesis-highlight>` element.
  const highlights = [];
  textNodeSpans.forEach(nodes => {
    // A custom element name is used here rather than `<span>` to reduce the
    // likelihood of highlights being hidden by page styling.
    const highlightEl = document.createElement('hypothesis-highlight');
    highlightEl.className = cssClass;

    nodes[0].parentNode.replaceChild(highlightEl, nodes[0]);
    nodes.forEach(node => highlightEl.appendChild(node));

    if (!isPlaceholder) {
      // For PDF highlights, create the highlight effect by using an SVG placed
      // above the page's canvas rather than CSS `background-color` on the
      // highlight element. This enables more control over blending of the
      // highlight with the content below.
      const svgHighlight = drawHighlightsAbovePdfCanvas(highlightEl);
      if (svgHighlight) {
        highlightEl.className += ' is-transparent';

        // Associate SVG element with highlight for use by `removeHighlights`.
        highlightEl.svgHighlight = svgHighlight;
      }
    }

    highlights.push(highlightEl);
  });

  return highlights;
}

/**
 * Replace a child `node` with `replacements`.
 *
 * nb. This is like `ChildNode.replaceWith` but it works in IE 11.
 *
 * @param {Node} node
 * @param {Node[]} replacements
 */
function replaceWith(node, replacements) {
  const parent = node.parentNode;
  replacements.forEach(r => parent.insertBefore(r, node));
  node.remove();
}

/**
 * Remove highlights from a range previously highlighted with `highlightRange`.
 *
 * @param {HTMLElement[]} highlights - The highlight elements returned by `highlightRange`
 */
export function removeHighlights(highlights) {
  for (let h of highlights) {
    if (h.parentNode) {
      const children = Array.from(h.childNodes);
      replaceWith(h, children);
    }

    if (h.svgHighlight) {
      h.svgHighlight.remove();
    }
  }
}

/**
 * @typedef Rect
 * @prop {number} top
 * @prop {number} left
 * @prop {number} bottom
 * @prop {number} right
 */

/**
 * Get the bounding client rectangle of a collection in viewport coordinates.
 * Unfortunately, Chrome has issues ([1]) with Range.getBoundingClient rect or we
 * could just use that.
 *
 * [1] https://bugs.chromium.org/p/chromium/issues/detail?id=324437
 *
 * @param {HTMLElement[]} collection
 * @return {Rect}
 */
export function getBoundingClientRect(collection) {
  // Reduce the client rectangles of the highlights to a bounding box
  const rects = collection.map(n => n.getBoundingClientRect());
  return rects.reduce((acc, r) => ({
    top: Math.min(acc.top, r.top),
    left: Math.min(acc.left, r.left),
    bottom: Math.max(acc.bottom, r.bottom),
    right: Math.max(acc.right, r.right),
  }));
}
