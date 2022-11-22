import { setupControls } from './controls.js';

setupControls();

// Set up links whose URLs should have a randomly generated suffix.
const randomizedLinks = Array.from(
  document.querySelectorAll('.js-randomize-url')
);
for (let link of randomizedLinks) {
  const randomizeUrl = () => {
    const randomHexString = Math.random()
      .toString()
      .slice(2 /* strip "0." prefix */, 6);
    link.href = link.href.replace(/(\/rand-.*)?$/, `/rand-${randomHexString}`);
  };
  randomizeUrl();
  link.addEventListener('click', randomizeUrl);
}
