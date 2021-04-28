/**
 * Return all `<iframe>` elements under `container` which are annotate-able.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * `enable-annotation` attribute.
 *
 * Eventually we may want annotation to be enabled by default for iframes that
 * pass certain tests. However we need to resolve a number of issues before we
 * can do that. See https://github.com/hypothesis/client/issues/530
 *
 * @param {Element} container
 * @return {HTMLIFrameElement[]}
 */
export function findFrames(container) {
  return Array.from(container.querySelectorAll('iframe[enable-annotation]'));
}

// Check if the iframe has already been injected
export function hasHypothesis(iframe) {
  return iframe.contentWindow.__hypothesis_frame === true;
}

// Inject embed.js into the iframe
export function injectHypothesis(iframe, scriptUrl, config) {
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
export function isAccessible(iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}

export function isDocumentReady(iframe, callback) {
  if (iframe.contentDocument.readyState === 'loading') {
    iframe.contentDocument.addEventListener('DOMContentLoaded', function () {
      callback();
    });
  } else {
    callback();
  }
}

export function isLoaded(iframe, callback) {
  if (iframe.contentDocument.readyState !== 'complete') {
    iframe.addEventListener('load', function () {
      callback();
    });
  } else {
    callback();
  }
}
