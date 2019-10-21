'use strict';

function currentScriptUrl(document_ = document) {
  try {
    const scriptEl = document_.currentScript;
    return new URL(scriptEl.src);
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
 */
function processUrlTemplate(url, document_ = document) {
  const scriptUrl = currentScriptUrl(document_);
  if (scriptUrl) {
    url = url.replace('{current_host}', scriptUrl.hostname);
    url = url.replace('{current_scheme}', scriptUrl.protocol.slice(0, -1));
  }
  return url;
}

module.exports = processUrlTemplate;
