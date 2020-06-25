/**
 * Extract the protocol and hostname (ie. host without port) from the URL.
 *
 * We don't use the URL constructor here because IE and early versions of Edge
 * do not support it and this code runs early in the life of the app before any
 * polyfills can be loaded.
 */
function extractOrigin(url) {
  const match = url.match(/(https?):\/\/([^:/]+)/);
  if (!match) {
    return null;
  }
  return { protocol: match[1], hostname: match[2] };
}

function currentScriptOrigin(document_ = document) {
  try {
    let scriptEl = /** @type {HTMLScriptElement} */ (document_.currentScript);

    if (!scriptEl) {
      // Fallback for IE 11.
      const scripts = document_.querySelectorAll('script');
      scriptEl = scripts[scripts.length - 1];
    }

    return extractOrigin(scriptEl.src);
  } catch (err) {
    return null;
  }
}

/**
 * Replace references to `current_host` and `current_scheme` URL template
 * parameters with the corresponding elements of the current script URL.
 *
 * During local development, there are cases when the client/h needs to be accessed
 * from a device or VM that is not the system where the development server is
 * running. In that case, all references to `localhost` need to be replaced
 * with the IP/hostname of the dev server.
 *
 * @param {string} url
 * @param {Document} document_
 */
export default function processUrlTemplate(url, document_ = document) {
  if (url.indexOf('{') === -1) {
    // Not a template. This should always be the case in production.
    return url;
  }

  const origin = currentScriptOrigin(document_);

  if (origin) {
    url = url.replace('{current_host}', origin.hostname);
    url = url.replace('{current_scheme}', origin.protocol);
  }

  return url;
}
