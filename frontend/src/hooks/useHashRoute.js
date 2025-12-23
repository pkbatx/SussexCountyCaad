import { useCallback, useEffect, useState } from "react";

function readHash() {
  return window.location.hash.replace("#", "");
}

export function useHashRoute(defaultRoute = "") {
  const [route, setRouteState] = useState(() => readHash() || defaultRoute);

  useEffect(() => {
    const handleHash = () => {
      const next = readHash() || defaultRoute;
      setRouteState(next);
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, [defaultRoute]);

  const setRoute = useCallback((nextRoute) => {
    const value = nextRoute || "";
    if (value === route) return;
    window.location.hash = value;
  }, [route]);

  return [route, setRoute];
}
