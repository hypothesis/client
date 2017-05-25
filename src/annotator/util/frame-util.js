'use strict';
// THESIS TODO: Once this module is finalized (more or less), then make
// sure to remove JQuery and refactor.
var $ = require('jquery');

module.exports = {
  findIFrames,
  hasHypothesis,
  injectHypothesis,
  isAccessible,
  isValid,
};

// Find all iframes within this iframe only
function findIFrames(iframe) {
  var iframes = [];

  $('iframe', iframe).each(function(index, iframe) {
    if ( isValid(iframe) ) {
      iframes.push(iframe);
    } 
  });

  return iframes;
}

// Check if the iframe has already been injected
function hasHypothesis(iframe) {
  // THESIS TODO: Are there better identifiers to use?
  var scripts = {
    src: [
      '/hypothesis',
      '/embed.js',
    ]
  };

  var frameBody = iframe.ownerDocument.body;
  var childNodes = frameBody.childNodes;
  var hasHypothesis = false;
  for (var i = 0; i < childNodes.length-1; i++) {
    var node = childNodes[i];
    if (node.tagName !== 'SCRIPT') continue; // Skip to next increment

    for (var j = 0; j < scripts.src.length-1; j++) {
      var src = scripts.src[j];
      if (node.src.includes(src)) {
        hasHypothesis = true;
        return; // Found our answer, stop looping.
      }
    }
  }

  return hasHypothesis;
}

// Inject embed.js into the iframe
function injectHypothesis(iframe, i) {
  if (!iframe) return;

  var iframes;
  // Support arrays via recursion
  if (iframe.constructor === Array) {
    if (!iframe.length) return;
    iframes = iframe;
    i = (i != undefined) ? i : 0; // if set, use i. Otherwise, use 0
    iframe = iframes[i];
  }

  var config = document.createElement('script');
  config.className = "js-hypothesis-config";
  config.type = "application/json";
  config.innerText = ' {"constructor": "Guest" }';

  // THESIS TODO: Temporarily hardcoded
  var src = 'http://localhost:3001/hypothesis';
  var embed = document.createElement('script');
  embed.async = true;
  embed.src = src;

  iframe.contentDocument.body.appendChild(config);
  iframe.contentDocument.body.appendChild(embed);

  if (iframes && i < iframes.length-1) {
    this._injectHypothesis(iframes, ++i);
  }
}

// Check if we can access this iframe's document
function isAccessible(iframe) {
  try {
    iframe.contentDocument;
    return true;
  } catch (e) {
    return false;
  }
}

// Check if this is an iframe that we want to inject embed.js into
function isValid(iframe) {
  // Currently only checks if it's not the h-sidebar
  return (iframe.className !== 'h-sidebar-iframe');
}
