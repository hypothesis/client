import { SvgIcon } from '@hypothesis/frontend-shared';

import SharedButtonPatterns from './patterns/SharedButtonPatterns';

import { useRoute } from '../router';

/**
 * @typedef PlaygroundRoute - Route "handler" that provides a component (function)
 *   that should be rendered for the indicated route
 * @prop {RegExp|string} route - Pattern or string path relative to
 *   `baseURL`, e.g. '/my-patterns'
 * @prop {string} title
 * @prop {import("preact").FunctionComponent<{}>} component
 */

function HomeRoute() {
  return (
    <>
      <h1 className="heading">UI component playground</h1>
      <p>Select a component to view examples.</p>
    </>
  );
}

/** @type {PlaygroundRoute[]} */
const routes = [
  {
    route: /^\/?$/,
    title: 'Home',
    component: HomeRoute,
  },
  {
    route: '/shared-buttons',
    title: 'Buttons',
    component: SharedButtonPatterns,
  },
];

const demoRoutes = routes.filter(r => r.component !== HomeRoute);

/**
 * @typedef PlaygroundAppProps
 * @prop {string} [baseURL]
 * @prop {PlaygroundRoute[]} [extraRoutes] - Local-/application-specific routes
 *   to add to this pattern library in addition to the shared/common routes
 */

/**
 * Render web content for the playground application. This includes the "frame"
 * around the page and a navigation channel, as well as the content rendered
 * by the component handling the current route.
 *
 * @param {PlaygroundAppProps} props
 */
export default function PlaygroundApp({
  baseURL = '/ui-playground',
  extraRoutes = [],
}) {
  const allRoutes = routes.concat(extraRoutes);
  const [route, navigate] = useRoute(baseURL, allRoutes);
  const content = route ? (
    <route.component />
  ) : (
    <>
      <h1 className="heading">:(</h1>
      <p>Page not found.</p>
    </>
  );

  return (
    <main className="PlaygroundApp">
      <div className="PlaygroundApp__sidebar">
        <div className="PlaygroundApp__sidebar-home">
          <a href={baseURL} onClick={e => navigate(e, '/')}>
            <SvgIcon name="logo" />
          </a>
        </div>
        <h2>Common Patterns</h2>
        <ul>
          {demoRoutes.map(c => (
            <li key={c.route}>
              <a
                className="PlaygroundApp__nav-link"
                key={c.route}
                href={/** @type string */ (c.route)}
                onClick={e => navigate(e, c.route)}
              >
                {c.title}
              </a>
            </li>
          ))}
        </ul>
        {extraRoutes.length && (
          <>
            <h2>Application Patterns</h2>
            <ul>
              {extraRoutes.map(c => (
                <li key={c.route}>
                  <a
                    className="PlaygroundApp__nav-link"
                    key={c.route}
                    href={/** @type string */ (c.route)}
                    onClick={e => navigate(e, c.route)}
                  >
                    {c.title}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="PlaygroundApp__content">{content}</div>
    </main>
  );
}
