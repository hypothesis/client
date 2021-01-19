 /**
  * Because the code in this file is not transpiled by Babel, it must be compatible
  * with all the supported browsers version (see `browserlist` in `package.json`)
  * without transpilation. Do not include latest EcmaScript features as these
  * will cause exceptions while working on dev (`localhost:3000`) on slightly
  * older, yet supported browser versions.
  */
 
// Code for controls on the dev server homepage.

(function () {
  let toggleClientButton = document.querySelector('.js-toggle-client');
  toggleClientButton.textContent = 'Unload client';
  let clientUrl = activeClientUrl;

  toggleClientButton.onclick = () => {
    if (activeClientUrl) {
      unloadClient();
      toggleClientButton.textContent = 'Load client';
    } else {
      loadClient(clientUrl);
      toggleClientButton.textContent = 'Unload client';
    }
  };
})();
