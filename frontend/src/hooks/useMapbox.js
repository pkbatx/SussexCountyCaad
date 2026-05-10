import { useEffect, useRef, useState } from "react";
import { createMapAdapter } from "../components/map/map-adapter";
import {
  DEFAULT_ZOOM,
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  SUSSEX_BOUNDS,
  SUSSEX_CENTER
} from "../config";

// Encapsulates the Mapbox init + cleanup dance shared by global and
// incident-scoped maps. Pass a containerRef and an optional view state
// (center/zoom from useMapViewState). Returns the adapter once the map
// fires "load"; null until then. The hook also wires a ResizeObserver
// so the canvas reflows when the right rail resizes.
export function useMapbox({ containerRef, viewState, onViewChange, fitBoundsOnInit = true }) {
  const adapterRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const [adapter, setAdapter] = useState(null);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || !containerRef.current || adapterRef.current) {
      return undefined;
    }

    const initialCenter = viewState?.center || SUSSEX_CENTER;
    const initialZoom =
      typeof viewState?.zoom === "number" ? viewState.zoom : DEFAULT_ZOOM;

    const created = createMapAdapter(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      accessToken: MAPBOX_ACCESS_TOKEN,
      style: MAPBOX_STYLE
    });

    adapterRef.current = created;
    setAdapter(created);

    if (fitBoundsOnInit && !viewState?.hasUserView) {
      created.setBounds(SUSSEX_BOUNDS);
    }

    if (typeof onViewChange === "function") {
      unsubscribeRef.current = created.onViewChange(onViewChange);
    }

    const scheduleResize = () => {
      const resize = () => created.map?.resize?.();
      requestAnimationFrame(() => requestAnimationFrame(resize));
      setTimeout(resize, 100);
    };
    scheduleResize();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleResize);
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", scheduleResize);

    return () => {
      unsubscribeRef.current?.();
      observer?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      created.destroy?.();
      adapterRef.current = null;
      setAdapter(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return adapter;
}
