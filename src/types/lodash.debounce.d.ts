// Self-contained types for lodash.debounce that include only the functionality
// we use and avoids adding types for the whole of lodash to our dependencies.
declare module 'lodash.debounce' {
  interface DebouncedFunction {
    (): void;
    cancel(): void;
    flush(): void;
  }

  interface DebounceOptions {
    maxWait?: number;
  }

  export default function debounce(
    callback: () => void,
    options?: DebounceOptions
  ): DebouncedFunction;

  export default function debounce(
    callback: () => void,
    delay: number
  ): DebouncedFunction;
}
