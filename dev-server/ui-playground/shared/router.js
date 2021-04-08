import { useEffect, useMemo, useState } from 'preact/hooks';

function routeFromCurrentURL(baseURL) {
  return location.pathname.slice(baseURL.length);
}

export function useRoute(baseURL, routes) {
  const [route, setRoute] = useState(() => routeFromCurrentURL(baseURL));
  const routeData = useMemo(() => routes.find(r => route.match(r.route)), [
    route,
    routes,
  ]);
  const title = `${routeData.title}: Hypothesis UI playground`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    const popstateListener = () => {
      setRoute(routeFromCurrentURL(baseURL));
    };
    window.addEventListener('popstate', popstateListener);
    return () => {
      window.removeEventListener('popstate', popstateListener);
    };
  }, [baseURL]);

  const navigate = (event, route) => {
    event.preventDefault();
    history.pushState({}, title, baseURL + route);
    setRoute(route);
  };

  return [routeData, navigate];
}
