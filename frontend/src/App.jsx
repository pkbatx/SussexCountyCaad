import React, { useCallback, useState } from "react";
import { HeaderBar } from "./components/layout/HeaderBar";
import { LeftRail } from "./components/layout/LeftRail";
import { TopFilterBar } from "./components/filters/TopFilterBar";
import { DigestColumn } from "./components/summary/DigestColumn";
import { IncidentsBoardDense } from "./components/incidents/IncidentsBoardDense";
import { CallDetail } from "./components/details/CallDetail";
import { IncidentDetail } from "./components/details/IncidentDetail";
import { MapView } from "./components/map/MapView";
import { NotificationFeed } from "./components/notifications/NotificationFeed";
import { createDefaultFilters, updateFilters } from "./state/filters";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSseStatus } from "./hooks/useSseStatus";
import { useDetailCache } from "./hooks/useDetailCache";
import { useMapViewState } from "./hooks/useMapViewState";

export function App() {
  const [filters, setFilters] = useState(createDefaultFilters);
  const [route, setRoute] = useHashRoute("incidents");
  const [refreshToken, setRefreshToken] = useState(0);
  const [returnRoute, setReturnRoute] = useState("incidents");
  const [activeIncidents, setActiveIncidents] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const handleRefresh = useCallback(() => {
    setRefreshToken(Date.now());
    setLastRefresh(Date.now());
  }, []);

  const { status: sseStatus } = useSseStatus({ onRefresh: handleRefresh });
  const { invalidateIncident, clearAll } = useDetailCache();
  const { viewState, updateViewState } = useMapViewState();

  const applyFilters = useCallback(
    (next) => {
      setFilters((prev) => updateFilters(prev, next));
      clearAll();
      handleRefresh();
    },
    [clearAll, handleRefresh]
  );

  const navigateToCall = useCallback(
    (callId) => {
      const fallbackRoute = route || "incidents";
      setReturnRoute(fallbackRoute);
      setRoute(`call/${callId}`);
    },
    [route, setRoute]
  );

  const handleMapSelect = useCallback(
    (point) => {
      if (point.entity_type === "call") {
        navigateToCall(point.entity_id);
      } else {
        setRoute(`incident/${point.entity_id}`);
      }
    },
    [navigateToCall, setRoute]
  );

  const renderCenter = () => {
    if (route.startsWith("call/")) {
      const callId = route.split("/")[1];
      return (
        <CallDetail
          callId={callId}
          prefetched={null}
          onBack={() => setRoute(returnRoute || "incidents")}
        />
      );
    }
    if (route.startsWith("incident/")) {
      const incidentId = route.split("/")[1];
      return (
        <IncidentDetail
          incidentId={incidentId}
          prefetched={null}
          onBack={() => setRoute("incidents")}
          onFeedback={invalidateIncident}
          onSelectCall={navigateToCall}
          refreshToken={refreshToken}
        />
      );
    }
    if (route === "notifications") {
      return <NotificationFeed refreshToken={refreshToken} />;
    }
    return (
      <IncidentsBoardDense
        filters={filters}
        refreshToken={refreshToken}
        onActiveCountChange={setActiveIncidents}
        onSelect={(incidentId) => setRoute(`incident/${incidentId}`)}
        onSelectCall={navigateToCall}
      />
    );
  };

  const showRightRail = route !== "notifications";

  return (
    <div className="tactical-shell">
      <HeaderBar
        sseStatus={sseStatus}
        lastRefresh={lastRefresh}
        activeIncidentCount={activeIncidents}
      />
      <div className="tactical-body" style={{ gridTemplateColumns: showRightRail ? "240px 1fr 320px" : "240px 1fr" }}>
        <LeftRail
          route={route}
          setRoute={setRoute}
          activeIncidents={activeIncidents}
          refreshToken={refreshToken}
        />
        <main className="tactical-center">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <TopFilterBar
              filters={filters}
              onChange={applyFilters}
              refreshToken={refreshToken}
              onMetrics={() => {}}
            />
          </div>
          {renderCenter()}
        </main>
        {showRightRail ? (
          <aside className="tactical-rail tactical-rail--right">
            <MapView
              filters={filters}
              refreshToken={refreshToken}
              viewState={viewState}
              onViewState={updateViewState}
              onModeChange={(next) => applyFilters({ mapMode: next })}
              onSelect={handleMapSelect}
            />
            <DigestColumn filters={filters} refreshToken={refreshToken} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
