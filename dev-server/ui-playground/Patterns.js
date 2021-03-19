import { toChildArray } from 'preact';

import jsxToString from './jsxToString';

export function PatternPage({ title, children }) {
  return (
    <section className="PatternPage">
      <h1>{title}</h1>
      <div className="PatternPage__content">{children}</div>
    </section>
  );
}

export function Pattern({ children, title }) {
  return (
    <section className="Pattern">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

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

export function PatternExample({ children, details }) {
  const source = toChildArray(children).map((child, idx) => {
    return (
      <li key={idx}>
        <code>{jsxToString(child)}</code>
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
