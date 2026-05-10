import { useCallback, useEffect, useState } from "react";

// Hash format: #route?key=value&key=value
// useHashRoute returns only the route segment; useHashParams returns only the
// query segment. Both write back the canonical hash, preserving the other half.

function splitHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const queryIndex = raw.indexOf("?");
  if (queryIndex === -1) return { route: raw, query: "" };
  return { route: raw.slice(0, queryIndex), query: raw.slice(queryIndex + 1) };
}

function writeHash({ route, query }) {
  window.location.hash = query ? `${route}?${query}` : route;
}

export function useHashRoute(defaultRoute = "") {
  const [route, setRouteState] = useState(() => splitHash().route || defaultRoute);

  useEffect(() => {
    const handler = () => setRouteState(splitHash().route || defaultRoute);
    window.addEventListener("hashchange", handler);
    handler();
    return () => window.removeEventListener("hashchange", handler);
  }, [defaultRoute]);

  const setRoute = useCallback((nextRoute) => {
    const value = nextRoute || "";
    if (value === route) return;
    const { query } = splitHash();
    writeHash({ route: value, query });
  }, [route]);

  return [route, setRoute];
}

export function useHashParams() {
  const [params, setParamsState] = useState(() => new URLSearchParams(splitHash().query));

  useEffect(() => {
    const handler = () => setParamsState(new URLSearchParams(splitHash().query));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const setParams = useCallback((next) => {
    const { route } = splitHash();
    const query = next instanceof URLSearchParams ? next.toString() : String(next || "");
    writeHash({ route, query });
  }, []);

  return [params, setParams];
}
