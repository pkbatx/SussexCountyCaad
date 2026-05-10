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
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ShortcutsCheatsheet } from "./components/common/ShortcutsCheatsheet";
import { createDefaultFilters, updateFilters } from "./state/filters";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSseStatus } from "./hooks/useSseStatus";
import { useDetailCache } from "./hooks/useDetailCache";
import { useMapViewState } from "./hooks/useMapViewState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export function App() {
  const [filters, setFilters] = useState(createDefaultFilters);
  const [route, setRoute] = useHashRoute("incidents");
  const [refreshToken, setRefreshToken] = useState(0);
  const [returnRoute, setReturnRoute] = useState("incidents");
  const [activeIncidents, setActiveIncidents] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [helpOpen, setHelpOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshToken(Date.now());
    setLastRefresh(Date.now());
  }, []);

  const { status: sseStatus } = useSseStatus({ onRefresh: handleRefresh });
  const { clearAll } = useDetailCache();
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
      setReturnRoute(route || "incidents");
      setRoute(`call/${callId}`);
    },
    [route, setRoute]
  );

  const handleMapSelect = useCallback(
    (point) => {
      if (point.entity_type === "call") navigateToCall(point.entity_id);
      else setRoute(`incident/${point.entity_id}`);
    },
    [navigateToCall, setRoute]
  );

  const handleBack = useCallback(() => {
    if (route.startsWith("call/")) setRoute(returnRoute || "incidents");
    else if (route.startsWith("incident/") || route === "notifications") setRoute("incidents");
  }, [route, returnRoute, setRoute]);

  // App-level keys handle Esc + ? globally. List-level j/k/Enter is owned by
  // the active list component so it can reach its own selection state.
  useKeyboardShortcuts({
    onBack: helpOpen ? () => setHelpOpen(false) : handleBack,
    onHelp: () => setHelpOpen((prev) => !prev),
    onSearch: () => {
      // TODO(perry): wire to the (not-yet-implemented) global search input.
    }
  });

  const renderCenter = () => {
    if (route.startsWith("call/")) {
      const callId = route.split("/")[1];
      return <CallDetail callId={callId} onBack={handleBack} />;
    }
    if (route.startsWith("incident/")) {
      const incidentId = route.split("/")[1];
      return (
        <IncidentDetail
          incidentId={incidentId}
          onBack={handleBack}
          onSelectCall={navigateToCall}
          refreshToken={refreshToken}
        />
      );
    }
    if (route === "notifications") return <NotificationFeed refreshToken={refreshToken} />;
    return (
      <IncidentsBoardDense
        filters={filters}
        refreshToken={refreshToken}
        onActiveCountChange={setActiveIncidents}
        onSelect={(incidentId) => setRoute(`incident/${incidentId}`)}
      />
    );
  };

  const showRightRail = route !== "notifications" && !route.startsWith("incident/");
  const isDetailRoute = route.startsWith("call/") || route.startsWith("incident/");

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
        <main className="tactical-center" style={isDetailRoute ? { display: "flex", flexDirection: "column", minHeight: 0 } : undefined}>
          {isDetailRoute ? null : (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <TopFilterBar
                filters={filters}
                onChange={applyFilters}
                refreshToken={refreshToken}
                onMetrics={() => {}}
              />
            </div>
          )}
          <ErrorBoundary onBack={() => setRoute("incidents")} key={route}>
            {renderCenter()}
          </ErrorBoundary>
        </main>
        {showRightRail ? (
          <aside className="tactical-rail tactical-rail--right">
            <MapView
              mode="global"
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
      <ShortcutsCheatsheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
