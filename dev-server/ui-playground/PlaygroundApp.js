import { SvgIcon } from '@hypothesis/frontend-shared';

import ComponentSection from './ComponentSection';

import ButtonsDemo from './ButtonsDemo';

import Menu from '../../src/sidebar/components/Menu';
import MenuItem from '../../src/sidebar/components/MenuItem';

import { useRoute } from './router';

function MenuDemo() {
  return (
    <ComponentSection title="Menu">
      <Menu label="Edit">
        <MenuItem label="Zoom in" />
        <MenuItem label="Zoom out" />
        <MenuItem label="Undo" />
        <MenuItem label="Redo" />
      </Menu>
    </ComponentSection>
  );
}

function HomeRoute() {
  return (
    <>
      <h1 className="heading">UI component playground</h1>
      <p>Select a component to view examples.</p>
    </>
  );
}

const routes = [
  {
    route: /^\/?$/,
    title: 'Home',
    component: HomeRoute,
  },
  {
    route: '/buttons',
    title: 'Buttons',
    component: ButtonsDemo,
  },
  {
    route: '/menu',
    title: 'Menu',
    component: MenuDemo,
  },
];

const demoRoutes = routes.filter(r => r.component !== HomeRoute);

export default function PlaygroundApp() {
  const baseUrl = '/ui-playground';
  const [route, navigate] = useRoute(baseUrl, routes);
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
          <a href={baseUrl} onClick={e => navigate(e, '/')}>
            <SvgIcon name="logo" />
          </a>
        </div>
        <ul>
          {demoRoutes.map(c => (
            <li key={c.route}>
              <a
                className="PlaygroundApp__nav-link"
                key={c.route}
                href={c.route}
                onClick={e => navigate(e, c.route)}
              >
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="PlaygroundApp__content">{content}</div>
    </main>
  );
}
