/**
 * Turn elements with a `js-toggle-client` class applied into buttons that
 * load/unload the client on the current page.
 *
 * This behavior mirrors what happens when the extension is activated and
 * de-activated on a page.
 */
function setupClientToggleButtons() {
  const toggleButtons = Array.from(
    document.querySelectorAll('.js-toggle-client')
  );

  for (const toggle of toggleButtons) {
    toggle.textContent = 'Unload client';

    // The `activeClientUrl`, `unloadClient` and `loadClient` functions come
    // from global variables added to the page by the dev server.
    let clientUrl = activeClientUrl;

    toggle.onclick = () => {
      if (activeClientUrl) {
        unloadClient();
        toggleButtons.forEach(btn => (btn.textContent = 'Load client'));
      } else {
        loadClient(clientUrl);
        toggleButtons.forEach(btn => (btn.textContent = 'Unload client'));
      }
    };
  }
}

/**
 * Add interactive functionality to common controls on the page with `js-*`
 * class names.
 */
export function setupControls() {
  setupClientToggleButtons();
}
