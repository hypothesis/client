// URL of the "h" service to load the client from.
// Change this to https://hypothes.is/ for the public Hypothesis service.

export const CLIENT_ORIGIN = 'http://localhost:5000';
//export const CLIENT_ORIGIN = 'https://hypothes.is';

export function loadClient() {
  const src = `${CLIENT_ORIGIN}/embed.js`;
  const scriptEl = document.createElement('script');
  scriptEl.src = src;
  document.body.appendChild(scriptEl);
}
