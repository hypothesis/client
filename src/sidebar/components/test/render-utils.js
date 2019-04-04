'use strict';

/**
 * Additional utilities for testing UI components.
 */

const { options } = require('preact');

/**
 * Run a function that does Preact component rendering and flush any async tasks
 * that are enqueued (`setState` calls, `useEffect` hooks etc.). Repeat until
 * everything stabilizies and no more tasks are enqueued.
 *
 * The `act` function (https://reactjs.org/docs/test-utils.html#act) from the
 * `preact/test-utils` package should do this, but the Preact version is currently
 * missing the "repeat until stable" part.
 */
function runUntilIdle(callback) {
  const prevOptions = {
    debounceRendering: options.debounceRendering,
    requestAnimationFrame: options.requestAnimationFrame,
  };
  const maxFrames = 10;

  try {
    // Temporarily override functions used to enqueue async tasks within Preact.
    let pendingTasks = [];
    const enqueueTask = task => pendingTasks.push(task);
    options.debounceRendering = enqueueTask;
    options.requestAnimationFrame = enqueueTask;

    // Run the passed function.
    callback();

    // Repeatedly flush until idle.
    let frameCount = 0;
    while (pendingTasks.length > 0 && frameCount < maxFrames) {
      const callbacks = [...pendingTasks];
      pendingTasks.splice(0, pendingTasks.length);
      callbacks.forEach(cb => cb());
      ++frameCount;
    }

    // Catch bugs which cause infinite rendering loops.
    if (pendingTasks.length > 0) {
      throw new Error(
        `Rendering failed to become idle after ${frameCount} frames`
      );
    }
  } finally {
    // Undo overrides.
    Object.assign(options, prevOptions);
  }
}

module.exports = { runUntilIdle };
