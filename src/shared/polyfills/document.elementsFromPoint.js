if (
  typeof document !== 'undefined' &&
  typeof document.elementsFromPoint === 'undefined'
) {
  if (
    // @ts-ignore
    typeof document.msElementsFromPoint !== 'undefined'
  ) {
    document.elementsFromPoint = (x, y) =>
      // @ts-ignore
      Array.from(document.msElementsFromPoint(x, y) ?? []);
  } else {
    document.elementsFromPoint = elementsFromPointPolyfill;
  }
}

/**
 * @param {number} x
 * @param {number} y
 */
function elementsFromPointPolyfill(x, y) {
  const elements = [];
  const pointerEvents = [];
  let el;

  do {
    const newElement = document.elementFromPoint(x, y);
    if (newElement && el !== newElement) {
      el = newElement;
      elements.push(el);
      // @ts-ignore Element does not have style property
      pointerEvents.push(el.style.pointerEvents);
      // @ts-ignore Element does not have style property
      el.style.pointerEvents = 'none';
    } else {
      el = null;
    }
  } while (el);

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    // @ts-ignore Element does not have style property
    el.style.pointerEvents = pointerEvents[i];
  }

  return elements;
}
