/**
 * Wait for a condition to evaluate to a truthy value.
 *
 * @return result of the `condition` function
 */
export async function waitFor<T>(
  condition: () => T,
  timeout = 10,
  what = condition.toString(),
): Promise<NonNullable<T>> {
  const result = condition();
  if (result) {
    return result;
  }

  const start = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const result = condition();
      if (result) {
        clearTimeout(timer);
        resolve(result);
      }
      if (Date.now() - start > timeout) {
        clearTimeout(timer);
        reject(new Error(`waitFor(${what}) failed after ${timeout} ms`));
      }
    });
  });
}

// Minimal Enzyme types needed by `waitForElement`.

// eslint-disable-next-line no-use-before-define
type Predicate = (wrapper: EnzymeWrapper) => boolean;

type EnzymeWrapper = {
  length: number;
  update(): void;
  find(query: string | Predicate): EnzymeWrapper;
};

/**
 * Wait up to `timeout` ms for an element to be rendered.
 *
 * @param selector - Selector string or function to pass to `wrapper.find`
 */
export function waitForElement(
  wrapper: EnzymeWrapper,
  selector: string | Predicate,
  timeout = 10,
): Promise<EnzymeWrapper> {
  return waitFor(
    () => {
      wrapper.update();
      const el = wrapper.find(selector);
      if (el.length === 0) {
        return null;
      }
      return el;
    },
    timeout,
    `"${selector}" to render`,
  );
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
