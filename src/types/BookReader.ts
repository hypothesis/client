/**
 * BookReader doesn't quite have types, so create a stub here
 *
 * Note that the definitions here are not complete, they only include properties
 * that the client uses.
 */

export type BookReader = {
  options: {
    bookTitle: string;
    bookUri: string;
  };

  refs: {
    $br: JQuery<HTMLElement>;
  };

  activeMode: {
    name: '1up' | '2up' | 'thumb';
  };

  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;

  jumpToIndex(index: number): void;
  switchMode(
    mode: '1up' | '2up' | 'thumb',
    options?: { suppressFragmentChange: boolean },
  ): void;

  _plugins: {
    textSelection:
      | undefined
      | {
          options: { enabled: boolean };
        };
  };
};

type JQuery<T> = {
  [index: number]: T;
  length: number;
  find: (selector: string) => JQuery<T>;
};
