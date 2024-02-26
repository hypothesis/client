declare module 'enzyme' {
  import type {
    Component,
    ComponentClass,
    ComponentType,
    FunctionComponent,
    JSX,
  } from 'preact';

  /**
   * Many methods in Enzyme's API accept a selector as an argument. Selectors in Enzyme can fall into one of the
   * following three categories:
   *
   *  1. A Valid CSS Selector
   *  2. A React Component Constructor
   *  3. A React Component's displayName
   *  4. A React Stateless component
   *  5. A React component property map
   */
  export interface EnzymePropSelector {
    [key: string]: any;
  }

  export type EnzymeSelector =
    | string
    | FunctionComponent<any>
    | ComponentClass<any>
    | EnzymePropSelector;

  export type Intercepter<T> = (intercepter: T) => void;

  export interface CommonWrapper<
    P = NonNullable<unknown>,
    S = NonNullable<unknown>,
    C = Component<P, S>,
  > {
    /**
     * Returns a new wrapper with only the nodes of the current wrapper that, when passed into the provided predicate function, return true.
     */
    filterWhere(predicate: (wrapper: this) => boolean): this;

    /**
     * Returns whether or not the current wrapper has a node anywhere in it's render tree that looks like the one passed in.
     */
    contains(node: JSX.Element | JSX.Element[] | string | number): boolean;

    /**
     * Returns whether or not a given react element exists in the shallow render tree.
     */
    containsMatchingElement(node: JSX.Element | JSX.Element[]): boolean;

    /**
     * Returns whether or not all the given react elements exists in the shallow render tree
     */
    containsAllMatchingElements(
      nodes: JSX.Element[] | JSX.Element[][],
    ): boolean;

    /**
     * Returns whether or not one of the given react elements exists in the shallow render tree.
     */
    containsAnyMatchingElements(
      nodes: JSX.Element[] | JSX.Element[][],
    ): boolean;

    /**
     * Returns whether or not the current render tree is equal to the given node, based on the expected value.
     */
    equals(node: JSX.Element): boolean;

    /**
     * Returns whether or not a given react element matches the shallow render tree.
     */
    matchesElement(node: JSX.Element): boolean;

    /**
     * Returns whether or not the current node has a className prop including the passed in class name.
     */
    hasClass(className: string | RegExp): boolean;

    /**
     * Invokes a function prop.
     * @param invokePropName The function prop to call.
     * @param ...args The arguments to the invokePropName function
     * @returns The value of the function.
     */
    invoke<
      K extends NonNullable<
        {
          [K in keyof P]-?: P[K] extends ((...arg: any[]) => void) | undefined
            ? K
            : never;
        }[keyof P]
      >,
    >(
      invokePropName: K,
    ): P[K];

    /**
     * Returns whether or not the current node matches a provided selector.
     */
    is(selector: EnzymeSelector): boolean;

    /**
     * Returns whether or not the current node is empty.
     * @deprecated Use .exists() instead.
     */
    isEmpty(): boolean;

    /**
     * Returns whether or not the current node exists.
     */
    exists(selector?: EnzymeSelector): boolean;

    /**
     * Returns a new wrapper with only the nodes of the current wrapper that don't match the provided selector.
     * This method is effectively the negation or inverse of filter.
     */
    not(selector: EnzymeSelector): this;

    /**
     * Returns a string of the rendered text of the current render tree. This function should be looked at with
     * skepticism if being used to test what the actual HTML output of the component will be. If that is what you
     * would like to test, use enzyme's render function instead.
     *
     * Note: can only be called on a wrapper of a single node.
     */
    text(): string;

    /**
     * Returns a string of the rendered HTML markup of the current render tree.
     *
     * Note: can only be called on a wrapper of a single node.
     */
    html(): string;

    /**
     * Returns the node at a given index of the current wrapper.
     */
    get(index: number): JSX.Element;

    /**
     * Returns the wrapper's underlying node.
     */
    getNode(): JSX.Element;

    /**
     * Returns the wrapper's underlying nodes.
     */
    getNodes(): JSX.Element[];

    /**
     * Returns the wrapper's underlying node.
     */
    getElement(): JSX.Element;

    /**
     * Returns the wrapper's underlying node.
     */
    getElements(): JSX.Element[];

    /**
     * Returns the outer most DOMComponent of the current wrapper.
     */
    getDOMNode<T extends Element = Element>(): T;

    /**
     * Returns a wrapper around the node at a given index of the current wrapper.
     */
    at(index: number): this;

    /**
     * Reduce the set of matched nodes to the first in the set.
     */
    first(): this;

    /**
     * Reduce the set of matched nodes to the last in the set.
     */
    last(): this;

    /**
     * Returns a new wrapper with a subset of the nodes of the original wrapper, according to the rules of `Array#slice`.
     */
    slice(begin?: number, end?: number): this;

    /**
     * Taps into the wrapper method chain. Helpful for debugging.
     */
    tap(intercepter: Intercepter<this>): this;

    /**
     * Returns the state hash for the root node of the wrapper. Optionally pass in a prop name and it will return just that value.
     */
    state(): S;
    state<K extends keyof S>(key: K): S[K];
    state<T>(key: string): T;

    /**
     * Returns the context hash for the root node of the wrapper. Optionally pass in a prop name and it will return just that value.
     */
    context(): any;
    context<T>(key: string): T;

    /**
     * Returns the props hash for the current node of the wrapper.
     *
     * NOTE: can only be called on a wrapper of a single node.
     */
    props(): P;

    /**
     * Returns the prop value for the node of the current wrapper with the provided key.
     *
     * NOTE: can only be called on a wrapper of a single node.
     */
    prop<K extends keyof P>(key: K): P[K];
    prop<T>(key: string): T;

    /**
     * Returns the key value for the node of the current wrapper.
     * NOTE: can only be called on a wrapper of a single node.
     */
    key(): string;

    /**
     * Simulate events.
     * Returns itself.
     * @param args?
     */
    simulate(event: string, ...args: any[]): this;

    /**
     * Used to simulate throwing a rendering error. Pass an error to throw.
     * Returns itself.
     * @param error
     */
    simulateError(error: any): this;

    /**
     * A method to invoke setState() on the root component instance similar to how you might in the definition of
     * the component, and re-renders. This method is useful for testing your component in hard to achieve states,
     * however should be used sparingly. If possible, you should utilize your component's external API in order to
     * get it into whatever state you want to test, in order to be as accurate of a test as possible. This is not
     * always practical, however.
     * Returns itself.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    setState<K extends keyof S>(state: Pick<S, K>, callback?: () => void): this;

    /**
     * A method that sets the props of the root component, and re-renders. Useful for when you are wanting to test
     * how the component behaves over time with changing props. Calling this, for instance, will call the
     * componentWillReceiveProps lifecycle method.
     *
     * Similar to setState, this method accepts a props object and will merge it in with the already existing props.
     * Returns itself.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    setProps<K extends keyof P>(props: Pick<P, K>, callback?: () => void): this;

    /**
     * A method that sets the context of the root component, and re-renders. Useful for when you are wanting to
     * test how the component behaves over time with changing contexts.
     * Returns itself.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    setContext(context: any): this;

    /**
     * Gets the instance of the component being rendered as the root node passed into shallow().
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    instance(): C;

    /**
     * Forces a re-render. Useful to run before checking the render output if something external may be updating
     * the state of the component somewhere.
     * Returns itself.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    update(): this;

    /**
     * Returns an html-like string of the wrapper for debugging purposes. Useful to print out to the console when
     * tests are not passing when you expect them to.
     */
    debug(options?: {
      /** Whether props should be omitted in the resulting string. Props are included by default. */
      ignoreProps?: boolean | undefined;
      /** Whether arrays and objects passed as props should be verbosely printed. */
      verbose?: boolean | undefined;
    }): string;

    /**
     * Returns the name of the current node of the wrapper.
     */
    name(): string;

    /**
     * Iterates through each node of the current wrapper and executes the provided function with a wrapper around
     * the corresponding node passed in as the first argument.
     *
     * Returns itself.
     * @param fn A callback to be run for every node in the collection. Should expect a ShallowWrapper as the first
     *              argument, and will be run with a context of the original instance.
     */
    forEach(fn: (wrapper: this, index: number) => any): this;

    /**
     * Maps the current array of nodes to another array. Each node is passed in as a ShallowWrapper to the map
     * function.
     * Returns an array of the returned values from the mapping function..
     * @param fn A mapping function to be run for every node in the collection, the results of which will be mapped
     *              to the returned array. Should expect a ShallowWrapper as the first argument, and will be run
     *              with a context of the original instance.
     */
    map<V>(fn: (wrapper: this, index: number) => V): V[];

    /**
     * Applies the provided reducing function to every node in the wrapper to reduce to a single value. Each node
     * is passed in as a ShallowWrapper, and is processed from left to right.
     */
    reduce<R>(
      fn: (prevVal: R, wrapper: this, index: number) => R,
      initialValue?: R,
    ): R;

    /**
     * Applies the provided reducing function to every node in the wrapper to reduce to a single value.
     * Each node is passed in as a ShallowWrapper, and is processed from right to left.
     */
    reduceRight<R>(
      fn: (prevVal: R, wrapper: this, index: number) => R,
      initialValue?: R,
    ): R;

    /**
     * Returns whether or not any of the nodes in the wrapper match the provided selector.
     */
    some(selector: EnzymeSelector): boolean;

    /**
     * Returns whether or not any of the nodes in the wrapper pass the provided predicate function.
     */
    someWhere(fn: (wrapper: this) => boolean): boolean;

    /**
     * Returns whether or not all of the nodes in the wrapper match the provided selector.
     */
    every(selector: EnzymeSelector): boolean;

    /**
     * Returns whether or not all of the nodes in the wrapper pass the provided predicate function.
     */
    everyWhere(fn: (wrapper: this) => boolean): boolean;

    /**
     * Returns true if renderer returned null
     */
    isEmptyRender(): boolean;

    /**
     * Renders the component to static markup and returns a Cheerio wrapper around the result.
     */
    // render(): cheerio.Cheerio; // TODO

    /**
     * Returns the type of the current node of this wrapper. If it's a composite component, this will be the
     * component constructor. If it's native DOM node, it will be a string of the tag name.
     *
     * Note: can only be called on a wrapper of a single node.
     */
    type(): string | ComponentClass<P> | FunctionComponent<P>;

    length: number;
  }

  export interface PreactWrapper<
    P = NonNullable<unknown>,
    S = NonNullable<unknown>,
    C = Component,
  > extends CommonWrapper<P, S, C> {}

  // Alias for libraries which depend on "standard" Enzyme types
  export type ReactWrapper<
    P = NonNullable<unknown>,
    S = NonNullable<unknown>,
    C = Component,
  > = PreactWrapper<P, S, C>;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
  export class PreactWrapper<
    P = NonNullable<unknown>,
    S = NonNullable<unknown>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    C = Component,
  > {
    constructor(
      nodes: JSX.Element | JSX.Element[],
      root?: PreactWrapper<any, any>,
      options?: MountRendererProps,
    );

    unmount(): this;
    mount(): this;

    /**
     * Returns a wrapper of the node that matches the provided reference name.
     *
     * NOTE: can only be called on a wrapper instance that is also the root instance.
     */
    ref(refName: string): PreactWrapper<any, any>;
    ref<P2, S2>(refName: string): PreactWrapper<P2, S2>;

    /**
     * Detaches the react tree from the DOM. Runs ReactDOM.unmountComponentAtNode() under the hood.
     *
     * This method will most commonly be used as a "cleanup" method if you decide to use the attachTo option in mount(node, options).
     *
     * The method is intentionally not "fluent" (in that it doesn't return this) because you should not be doing anything with this wrapper after this method is called.
     *
     * Using the attachTo is not generally recommended unless it is absolutely necessary to test something.
     * It is your responsibility to clean up after yourself at the end of the test if you do decide to use it, though.
     */
    detach(): void;

    /**
     * Strips out all the not host-nodes from the list of nodes
     *
     * This method is useful if you want to check for the presence of host nodes
     * (actually rendered HTML elements) ignoring the React nodes.
     */
    hostNodes(): PreactWrapper<JSX.HTMLAttributes>;

    /**
     * Find every node in the render tree that matches the provided selector.
     * @param selector The selector to match.
     */
    find<P2>(
      statelessComponent: FunctionComponent<P2>,
    ): PreactWrapper<P2, never>;
    find<P2>(component: ComponentType<P2>): PreactWrapper<P2, any>;
    find<C2 extends Component>(
      componentClass: ComponentClass<C2['props']>,
    ): PreactWrapper<C2['props'], C2['state'], C2>;
    find(props: EnzymePropSelector): PreactWrapper<any, any>;
    find(selector: string): PreactWrapper<JSX.HTMLAttributes, any>;

    /**
     * Finds every node in the render tree that returns true for the provided predicate function.
     */
    findWhere(
      predicate: (wrapper: PreactWrapper<any, any>) => boolean,
    ): PreactWrapper<any, any>;

    /**
     * Removes nodes in the current wrapper that do not match the provided selector.
     * @param selector The selector to match.
     */
    filter<P2>(
      statelessComponent: FunctionComponent<P2>,
    ): PreactWrapper<P2, never>;
    filter<P2>(component: ComponentType<P2>): PreactWrapper<P2, any>;
    filter(props: EnzymePropSelector | string): PreactWrapper<P, S>;

    /**
     * Returns a new wrapper with all of the children of the node(s) in the current wrapper. Optionally, a selector
     * can be provided and it will filter the children by this selector.
     */
    children<P2>(
      statelessComponent: FunctionComponent<P2>,
    ): PreactWrapper<P2, never>;
    children<P2>(component: ComponentType<P2>): PreactWrapper<P2, any>;
    children(selector: string): PreactWrapper<JSX.HTMLAttributes, any>;
    children(props?: EnzymePropSelector): PreactWrapper<any, any>;

    /**
     * Returns a new wrapper with child at the specified index.
     */
    childAt(index: number): PreactWrapper<any, any>;
    childAt<P2, S2>(index: number): PreactWrapper<P2, S2>;

    /**
     * Returns a wrapper around all of the parents/ancestors of the wrapper. Does not include the node in the
     * current wrapper. Optionally, a selector can be provided and it will filter the parents by this selector.
     *
     * Note: can only be called on a wrapper of a single node.
     */
    parents<P2>(
      statelessComponent: FunctionComponent<P2>,
    ): PreactWrapper<P2, never>;
    parents<P2>(component: ComponentType<P2>): PreactWrapper<P2, any>;
    parents(selector: string): PreactWrapper<JSX.HTMLAttributes, any>;
    parents(props?: EnzymePropSelector): PreactWrapper<any, any>;

    /**
     * Returns a wrapper of the first element that matches the selector by traversing up through the current node's
     * ancestors in the tree, starting with itself.
     *
     * Note: can only be called on a wrapper of a single node.
     */
    closest<P2>(
      statelessComponent: FunctionComponent<P2>,
    ): PreactWrapper<P2, never>;
    closest<P2>(component: ComponentType<P2>): PreactWrapper<P2, any>;
    closest(props: EnzymePropSelector): PreactWrapper<any, any>;
    closest(selector: string): PreactWrapper<JSX.HTMLAttributes, any>;

    /**
     * Returns a wrapper with the direct parent of the node in the current wrapper.
     */
    parent(): PreactWrapper<any, any>;

    /**
     * Returns a wrapper of the node rendered by the provided render prop.
     */
    renderProp<PropName extends keyof P>(
      prop: PropName,
    ): (
      ...params: P[PropName] extends (...args: infer P) => any ? P : never[]
    ) => PreactWrapper<any, never>;

    /**
     * If a wrappingComponent was passed in options,
     * this methods returns a PreactWrapper around the rendered wrappingComponent.
     * This PreactWrapper can be used to update the wrappingComponent's props and state
     */
    getWrappingComponent: () => PreactWrapper;
  }

  export interface MountRendererProps {
    /**
     * Context to be passed into the component
     */
    context?: NonNullable<unknown> | undefined;
    /**
     * DOM Element to attach the component to
     */
    attachTo?: HTMLElement | null | undefined;
    /**
     * Merged contextTypes for all children of the wrapper
     */
    childContextTypes?: NonNullable<unknown> | undefined;
    /**
     * A component that will render as a parent of the node.
     * It can be used to provide context to the `node`, among other things.
     * See the [getWrappingComponent() docs](https://airbnb.io/enzyme/docs/api/ShallowWrapper/getWrappingComponent.html) for an example.
     * **Note**: `wrappingComponent` must render its children.
     */
    wrappingComponent?: ComponentType<any> | undefined;
    /**
     * Initial props to pass to the `wrappingComponent` if it is specified.
     */
    wrappingComponentProps?: NonNullable<unknown> | undefined;
  }

  /**
   * Mounts and renders a preact component into the document and provides a testing wrapper around it.
   */
  export function mount<C extends Component, P = C['props'], S = C['state']>(
    node: JSX.Element,
    options?: MountRendererProps,
  ): PreactWrapper<P, S, C>;
  export function mount<P>(
    node: JSX.Element,
    options?: MountRendererProps,
  ): PreactWrapper<P, any>;
  export function mount<P, S>(
    node: JSX.Element,
    options?: MountRendererProps,
  ): PreactWrapper<P, S>;
}
