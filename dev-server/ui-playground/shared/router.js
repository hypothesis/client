import { useEffect, useMemo, useState } from 'preact/hooks';

function routeFromCurrentUrl(baseUrl) {
  return location.pathname.slice(baseUrl.length);
}

export function useRoute(baseUrl, routes) {
  const [route, setRoute] = useState(() => routeFromCurrentUrl(baseUrl));
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
      setRoute(routeFromCurrentUrl(baseUrl));
    };
    window.addEventListener('popstate', popstateListener);
    return () => {
      window.removeEventListener('popstate', popstateListener);
    };
  }, [baseUrl]);

  const navigate = (event, route) => {
    event.preventDefault();
    history.pushState({}, title, baseUrl + route);
    setRoute(route);
  };

  return [routeData, navigate];
}
