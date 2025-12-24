import React, { useCallback, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { TopFilterBar } from "./components/filters/TopFilterBar";
import { DigestColumn } from "./components/summary/DigestColumn";
import { IncidentsBoard } from "./components/incidents/IncidentsBoard";
import { CallDetail } from "./components/details/CallDetail";
import { IncidentDetail } from "./components/details/IncidentDetail";
import { AudioPlayer } from "./components/audio/AudioPlayer";
import { MapView } from "./components/map/MapView";
import { NotificationsView } from "./components/notifications/NotificationsView";
import { createDefaultFilters, updateFilters } from "./state/filters";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSseStatus } from "./hooks/useSseStatus";
import { useDetailCache } from "./hooks/useDetailCache";
import { useMapViewState } from "./hooks/useMapViewState";

export function App() {
  const [filters, setFilters] = useState(createDefaultFilters);
  const [route, setRoute] = useHashRoute("incidents");
  const [refreshToken, setRefreshToken] = useState(0);
  const [audioSource, setAudioSource] = useState(null);
  const [returnRoute, setReturnRoute] = useState("incidents");

  const handleRefresh = useCallback(() => setRefreshToken(Date.now()), []);
  const { status: sseStatus } = useSseStatus({
    onRefresh: handleRefresh
  });

  const {
    invalidateCall,
    invalidateIncident,
    clearAll
  } = useDetailCache();
  const { viewState, updateViewState } = useMapViewState();

  const applyFilters = useCallback(
    (next) => {
      setFilters((prev) => updateFilters(prev, next));
      clearAll();
      setRefreshToken(Date.now());
    },
    [clearAll]
  );

  const audioFooter = <AudioPlayer source={audioSource} />;
  const topbar = (
    <TopFilterBar
      filters={filters}
      onChange={applyFilters}
      refreshToken={refreshToken}
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
      <DigestColumn filters={filters} refreshToken={refreshToken} />
      {mapPanel}
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
            onPlayAudio={setAudioSource}
            onFeedback={invalidateCall}
          />
        }
        right={rightColumn}
        summary={null}
        topbar={topbar}
        footer={audioFooter}
        sseStatus={{ status: sseStatus }}
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
          />
        }
        right={rightColumn}
        summary={null}
        topbar={topbar}
        footer={audioFooter}
        sseStatus={{ status: sseStatus }}
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
      footer={audioFooter}
      sseStatus={{ status: sseStatus }}
      layout="ops"
      centerSpan="two"
    />
  );
}
