/** @typedef {import('../util/build-thread').Thread} Thread */

/**
 * Count the number of annotations/replies in the `thread` whose `visible`
 * property matches `visibility`.
 *
 * @param {Thread} thread
 * @param {boolean} visibility — `true`: count visible annotations
 *                               `false`: count hidden annotations
 * @return {number}
 */
function countByVisibility(thread, visibility) {
  const matchesVisibility =
    !!thread.annotation && thread.visible === visibility;
  return thread.children.reduce(
    (count, reply) => count + countByVisibility(reply, visibility),
    matchesVisibility ? 1 : 0
  );
}

/**
 * Count the hidden annotations/replies in the `thread`
 */
export function countHidden(thread) {
  return countByVisibility(thread, false);
}

/**
 * Count the visible annotations/replies in the `thread`
 */
export function countVisible(thread) {
  return countByVisibility(thread, true);
}
