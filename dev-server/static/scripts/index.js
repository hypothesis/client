// Code for controls on the dev server homepage.

import { activeClientUrl, loadClient, unloadClient } from './util.js';

const toggleClientButton = document.querySelector('.js-toggle-client');
toggleClientButton.textContent = 'Unload client';
const clientUrl = activeClientUrl;

toggleClientButton.onclick = () => {
  if (activeClientUrl) {
    unloadClient();
    toggleClientButton.textContent = 'Load client';
  } else {
    loadClient(clientUrl);
    toggleClientButton.textContent = 'Unload client';
  }
};

