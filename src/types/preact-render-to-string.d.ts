// This local type definition is used to address an incorrect one from
// preact-render-to-string.
// As soon as https://github.com/preactjs/preact-render-to-string/issues/328
// is solved upstream, we can remove this.
declare module 'preact-render-to-string/jsx' {
  import type { VNode } from 'preact';

  interface Options {
    jsx?: boolean;
    xml?: boolean;
    pretty?: boolean | string;
    shallow?: boolean;
    functions?: boolean;
    functionNames?: boolean;
    skipFalseAttributes?: boolean;
  }

  export default function renderToStringPretty(
    vnode: VNode,
    context?: any,
    options?: Options,
  ): string;

  export function shallowRender(vnode: VNode, context?: any): string;
}
