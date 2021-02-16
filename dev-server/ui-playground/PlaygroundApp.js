import { SvgIcon } from '@hypothesis/frontend-shared';

import Button from '../../src/sidebar/components/Button';
import Menu from '../../src/sidebar/components/Menu';
import MenuItem from '../../src/sidebar/components/MenuItem';

import { useRoute } from './router';

function ComponentDemo({ title, children }) {
  return (
    <section>
      <h1 className="heading">{title}</h1>
      {children}
    </section>
  );
}

function ButtonDemo() {
  return (
    <ComponentDemo title="Button">
      <Button buttonText="Text button" />
      <Button icon="edit" title="Icon button" />
      <Button icon="trash" buttonText="Icon + text button" />
      <Button disabled={true} buttonText="Disabled button" />
    </ComponentDemo>
  );
}

function MenuDemo() {
  return (
    <ComponentDemo title="Menu">
      <Menu label="Edit">
        <MenuItem label="Zoom in" />
        <MenuItem label="Zoom out" />
        <MenuItem label="Undo" />
        <MenuItem label="Redo" />
      </Menu>
    </ComponentDemo>
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
    route: '/button',
    title: 'Button',
    component: ButtonDemo,
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
        <a
          className="PlaygroundApp__nav-link u-center"
          href={baseUrl}
          onClick={e => navigate(e, '/')}
        >
          <SvgIcon name="logo" />
        </a>
        {demoRoutes.map(c => (
          <a
            className="PlaygroundApp__nav-link"
            key={c.route}
            href={c.route}
            onClick={e => navigate(e, c.route)}
          >
            {c.title}
          </a>
        ))}
      </div>
      <div className="PlaygroundApp__content">{content}</div>
    </main>
  );
}
