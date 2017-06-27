'use strict';

// Find all iframes within this iframe only
function findFrames (container) {
  var frames = Array.from(container.getElementsByTagName('iframe'));
  return frames.filter(isValid);
}

// Check if the iframe has already been injected
function hasHypothesis (iframe) {
  return iframe.contentWindow.__hypothesis_frame === true;
}

// Inject embed.js into the iframe
function injectHypothesis (iframe, scriptUrl) {
  var config = document.createElement('script');
  config.className = 'js-hypothesis-config';
  config.type = 'application/json';
  config.innerText = '{"enableMultiFrameSupport": true, "subFrameInstance": true}';

  var src = scriptUrl;
  var embed = document.createElement('script');
  embed.className = 'js-hypothesis-embed';
  embed.async = true;
  embed.src = src;

  iframe.contentDocument.body.appendChild(config);
  iframe.contentDocument.body.appendChild(embed);
}

// Check if we can access this iframe's document
function isAccessible (iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}

// Check if this is an iframe that we want to inject embed.js into
function isValid (iframe) {
  // Currently only checks if it's not the h-sidebar
  return iframe.className !== 'h-sidebar-iframe';
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
  isValid: isValid,
  isLoaded: isLoaded,
  isDocumentReady: isDocumentReady,
};
