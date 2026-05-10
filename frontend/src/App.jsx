import React, { useCallback, useMemo, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { TopFilterBar } from "./components/filters/TopFilterBar";
import { DigestColumn } from "./components/summary/DigestColumn";
import { IncidentsBoard } from "./components/incidents/IncidentsBoard";
import { CallDetail } from "./components/details/CallDetail";
import { IncidentDetail } from "./components/details/IncidentDetail";
import { MapView } from "./components/map/MapView";
import { NotificationsView } from "./components/notifications/NotificationsView";
import { createDefaultFilters, updateFilters } from "./state/filters";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSseStatus } from "./hooks/useSseStatus";
import { useDetailCache } from "./hooks/useDetailCache";
import { useMapViewState } from "./hooks/useMapViewState";
import { formatDateTime24, parseFilenameTimestamp } from "./state/formatting";

export function App() {
  const [filters, setFilters] = useState(createDefaultFilters);
  const [route, setRoute] = useHashRoute("incidents");
  const [refreshToken, setRefreshToken] = useState(0);
  const [returnRoute, setReturnRoute] = useState("incidents");
  const [summaryMetrics, setSummaryMetrics] = useState(null);

  const handleRefresh = useCallback(() => setRefreshToken(Date.now()), []);
  const { status: sseStatus } = useSseStatus({
    onRefresh: handleRefresh
  });

  const { invalidateIncident, clearAll } = useDetailCache();
  const { viewState, updateViewState } = useMapViewState();

  const applyFilters = useCallback(
    (next) => {
      setFilters((prev) => updateFilters(prev, next));
      clearAll();
      setRefreshToken(Date.now());
    },
    [clearAll]
  );

  const handleMetrics = useCallback((next) => {
    setSummaryMetrics(next);
  }, []);

  const lastCallTime = useMemo(() => {
    if (!summaryMetrics) return null;
    const fromFilename = parseFilenameTimestamp(summaryMetrics.latest_call_source);
    if (fromFilename) return fromFilename;
    if (summaryMetrics.latest_call_seen_at) {
      const parsed = new Date(summaryMetrics.latest_call_seen_at);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  }, [summaryMetrics]);

  const nav = (
    <div className="last-call-pill">
      <span className="last-call-label">Last call</span>
      <span className="last-call-value">
        {lastCallTime ? formatDateTime24(lastCallTime) : "Unknown"}
      </span>
    </div>
  );

  const topbar = (
    <TopFilterBar
      filters={filters}
      onChange={applyFilters}
      refreshToken={refreshToken}
      onMetrics={handleMetrics}
    />
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

  const mapPanel = (
    <MapView
      filters={filters}
      refreshToken={refreshToken}
      viewState={viewState}
      onViewState={updateViewState}
      onModeChange={(next) => applyFilters({ mapMode: next })}
      onSelect={handleMapSelect}
    />
  );

  const rightColumn = (
    <div className="ops-right-stack">
      {mapPanel}
      <DigestColumn filters={filters} refreshToken={refreshToken} />
    </div>
  );

  if (route.startsWith("call/")) {
    const callId = route.split("/")[1];
    return (
      <AppLayout
        title="Call Detail"
        left={null}
        center={
          <CallDetail
            callId={callId}
            prefetched={null}
            onBack={() => setRoute(returnRoute || "incidents")}
          />
        }
        right={rightColumn}
        summary={null}
        topbar={topbar}
        footer={null}
        sseStatus={{ status: sseStatus }}
        nav={nav}
        layout="ops"
        centerSpan="two"
      />
    );
  }

  if (route.startsWith("incident/")) {
    const incidentId = route.split("/")[1];
    return (
      <AppLayout
        title="Incident Detail"
        left={null}
        center={
          <IncidentDetail
            incidentId={incidentId}
            prefetched={null}
            onBack={() => setRoute("incidents")}
            onFeedback={invalidateIncident}
            onSelectCall={navigateToCall}
            refreshToken={refreshToken}
          />
        }
        right={rightColumn}
        summary={null}
        topbar={topbar}
        footer={null}
        sseStatus={{ status: sseStatus }}
        nav={nav}
        layout="ops"
        centerSpan="two"
      />
    );
  }

  if (route === "notifications") {
    return (
      <AppLayout
        title="Notifications"
        left={null}
        center={<NotificationsView />}
        right={null}
        summary={null}
        topbar={topbar}
        footer={null}
        sseStatus={{ status: sseStatus }}
        nav={nav}
      />
    );
  }

  return (
    <AppLayout
      title={null}
      left={null}
      center={
        <IncidentsBoard
          filters={filters}
          refreshToken={refreshToken}
          onSelect={(incidentId) => setRoute(`incident/${incidentId}`)}
          onSelectCall={navigateToCall}
        />
      }
      right={rightColumn}
      summary={null}
      topbar={topbar}
      footer={null}
      sseStatus={{ status: sseStatus }}
      nav={nav}
      layout="ops"
      centerSpan="two"
    />
  );
}
