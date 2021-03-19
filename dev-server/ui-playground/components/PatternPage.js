import { toChildArray } from 'preact';

import { jsxToString } from '../util/jsx-to-string';

/**
 * Components to render patterns and examples. Typical structure of a "Demo"
 * page might be:
 *
 * <PatternPage title="Zoo Animals">
 *   <Pattern title="Elephant">
 *     <p>Everyone loves an elephant.</p>
 *
 *     <PatternExamples title="Colored elephants">
 *       <PatternExample details="Pink elephant">
 *          <Elephant color="pink" />
 *       </PatternExample>
 *       <PatternExample details="Blue elephant">
 *          <Elephant color="blue" />
 *       </PatternExample>
 *     </PatternExamples>
 *
 *     <PatternExamples title="Patterned elephants">
 *       <PatternExample details="Spotted elephant">
 *          <Elephant variant="spotted" />
 *       </PatternExample>
 *     </PatternExamples>
 *   </Pattern>
 *
 *   <Pattern title="Monkeys">
 *     <PatternExamples>
 *       <PatternExample details="Your basic monkey">
 *         <Monkey />
 *       </PatternExample>
 *     </PatternExamples>
 *   </Pattern>
 * </PatternPage>
 */

/**
 * @typedef PatternPageProps
 * @prop {import("preact").ComponentChildren} children
 * @prop {string} title
 */

/**
 * Render a page of patterns
 * @param {PatternPageProps} props
 */
export function PatternPage({ children, title }) {
  return (
    <section className="PatternPage">
      <h1>{title}</h1>
      <div className="PatternPage__content">{children}</div>
    </section>
  );
}

/**
 * @typedef PatternProps
 * @prop {import("preact").ComponentChildren} children
 * @prop {string} title
 */

/**
 * A pattern and its examples
 * @param {PatternProps} props
 */
export function Pattern({ children, title }) {
  return (
    <section className="Pattern">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/**
 * @typedef PatternExamplesProps
 * @prop {import("preact").ComponentChildren} children
 * @prop {string} [title]
 */

/**
 * Tabular layout of one or more `PatternExample` components, with optional
 * title.
 *
 * @param {PatternExamplesProps} props
 */
export function PatternExamples({ children, title }) {
  return (
    <table className="PatternExamples">
      {title && (
        <tr>
          <th colSpan="3">
            <h3>{title}</h3>
          </th>
        </tr>
      )}
      <tr>
        <th>Example</th>
        <th>Details</th>
        <th>Source</th>
      </tr>
      {children}
    </table>
  );
}

/**
 * @typedef PatternExampleProps
 * @prop {import("preact").ComponentChildren} children - Example source
 * @prop {string} details - Details about the pattern example
 */

/**
 * Tabular layout of a single example. Will render its `children` as the
 * example, as well as the source JSX of its `children`
 *
 * @param {PatternExampleProps} props
 */
export function PatternExample({ children, details }) {
  const source = toChildArray(children).map((child, idx) => {
    return (
      <li key={idx}>
        <code>
          <pre>{jsxToString(child)}</pre>
        </code>
      </li>
    );
  });
  return (
    <tr>
      <td className="PatternExample__example">{children}</td>
      <td>{details}</td>
      <td>
        <ul>{source}</ul>
      </td>
    </tr>
  );
}
