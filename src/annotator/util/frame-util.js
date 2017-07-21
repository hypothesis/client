'use strict';

// Find all iframes within this iframe only
function findFrames (container) {
  const frames = Array.from(container.getElementsByTagName('iframe'));
  return frames.filter(isValid);
}

// Check if the iframe has already been injected
function hasHypothesis (iframe) {
  return iframe.contentWindow.__hypothesis_frame === true;
}

// Inject embed.js into the iframe
function injectHypothesis (iframe, scriptUrl, config) {
  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(config);

  const src = scriptUrl;
  const embedElement = document.createElement('script');
  embedElement.className = 'js-hypothesis-embed';
  embedElement.async = true;
  embedElement.src = src;

  iframe.contentDocument.body.appendChild(configElement);
  iframe.contentDocument.body.appendChild(embedElement);
}

// Check if we can access this iframe's document
function isAccessible (iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}


/**
 * Check if the frame elements being considered for injection have the
 * basic heuristics for content that a user might want to annotate.
 *  Rules:
 *    - avoid our client iframe
 *    - iframe should be sizeable - to avoid the small advertisement and social plugins
 *
 * @param  {HTMLIFrameElement} iframe the frame being checked
 * @returns {boolean}   result of our validity checks
 */
function isValid (iframe) {

  const isNotClientFrame = !iframe.classList.contains('h-sidebar-iframe');

  const frameRect = iframe.getBoundingClientRect();
  const MIN_WIDTH = 150;
  const MIN_HEIGHT = 150;
  const hasSizableContainer = frameRect.width > MIN_WIDTH && frameRect.height > MIN_HEIGHT;

  return isNotClientFrame && hasSizableContainer;
}

function isDocumentReady (iframe, callback) {
  if (iframe.contentDocument.readyState === 'loading') {
    iframe.contentDocument.addEventListener('DOMContentLoaded', function () {
      callback();
    });
  } else {
    callback();
  }
}

function isLoaded (iframe, callback) {
  if (iframe.contentDocument.readyState !== 'complete') {
    iframe.addEventListener('load', function () {
      callback();
    });
  } else {
    callback();
  }
}

module.exports = {
  findFrames: findFrames,
  hasHypothesis: hasHypothesis,
  injectHypothesis: injectHypothesis,
  isAccessible: isAccessible,
  isLoaded: isLoaded,
  isDocumentReady: isDocumentReady,
};
