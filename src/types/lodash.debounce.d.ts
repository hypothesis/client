// Self-contained types for lodash.debounce that include only the functionality
// we use and avoids adding types for the whole of lodash to our dependencies.
declare module 'lodash.debounce' {
  interface DebouncedFunction<Args extends unknown[]> {
    (...args: Args): void;
    cancel(): void;
    flush(): void;
  }

  interface DebounceOptions {
    leading?: boolean;
    maxWait?: number;
    trailing?: boolean;
  }

  export default function debounce<Args extends unknown[]>(
    callback: (...args: Args) => void,
    options?: DebounceOptions,
  ): DebouncedFunction<Args>;

  export default function debounce<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number,
    options?: DebounceOptions,
  ): DebouncedFunction<Args>;
}
