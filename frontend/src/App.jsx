import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { FilterPanel } from "./components/filters/FilterPanel";
import { SummaryPanel } from "./components/summary/SummaryPanel";
import { CallsList } from "./components/calls/CallsList";
import { IncidentsBoard } from "./components/incidents/IncidentsBoard";
import { CallDetail } from "./components/details/CallDetail";
import { IncidentDetail } from "./components/details/IncidentDetail";
import { AudioPlayer } from "./components/audio/AudioPlayer";
import { ViewToggle } from "./components/controls/ViewToggle";
import { MapView } from "./components/map/MapView";
import { NotificationsView } from "./components/notifications/NotificationsView";
import { createDefaultFilters, updateFilters } from "./state/filters";
import { useHashRoute } from "./hooks/useHashRoute";
import { useSseStatus } from "./hooks/useSseStatus";
import { useDetailCache } from "./hooks/useDetailCache";
import { useMapViewState } from "./hooks/useMapViewState";

export function App() {
  const [filters, setFilters] = useState(createDefaultFilters);
  const [listMode, setListMode] = useState("incidents");
  const [route, setRoute] = useHashRoute("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [audioSource, setAudioSource] = useState(null);

  const handleRefresh = useCallback(() => setRefreshToken(Date.now()), []);
  const { status: sseStatus } = useSseStatus({
    onRefresh: handleRefresh
  });

  const {
    getCachedCall,
    invalidateCall,
    invalidateIncident,
    clearAll
  } = useDetailCache();
  const { viewState, updateViewState } = useMapViewState();

  useEffect(() => {
    if (route === "calls" || route === "incidents") {
      setListMode(route);
    }
  }, [route]);

  const applyFilters = useCallback(
    (next) => {
      setFilters((prev) => updateFilters(prev, next));
      clearAll();
      setRefreshToken(Date.now());
    },
    [clearAll]
  );

  const summary = useMemo(
    () => <SummaryPanel filters={filters} refreshToken={refreshToken} />,
    [filters, refreshToken]
  );

  const leftPanel = useMemo(
    () => <FilterPanel filters={filters} onChange={applyFilters} />,
    [filters, applyFilters]
  );

  const audioFooter = <AudioPlayer source={audioSource} />;

  if (route.startsWith("call/")) {
    const callId = route.split("/")[1];
    return (
      <AppLayout
        title="Call Detail"
        left={leftPanel}
        center={
          <CallDetail
            callId={callId}
            prefetched={null}
            onBack={() => setRoute("")}
            onPlayAudio={setAudioSource}
            onFeedback={invalidateCall}
          />
        }
        right={
          <MapView
            filters={filters}
            refreshToken={refreshToken}
            viewState={viewState}
            onViewState={updateViewState}
            onModeChange={(next) => applyFilters({ mapMode: next })}
            onSelect={(point) => {
              if (point.entity_type === "call") {
                setRoute(`call/${point.entity_id}`);
              } else {
                setRoute(`incident/${point.entity_id}`);
              }
            }}
          />
        }
        summary={summary}
        footer={audioFooter}
        sseStatus={{ status: sseStatus }}
      />
    );
  }

  if (route.startsWith("incident/")) {
    const incidentId = route.split("/")[1];
    return (
      <AppLayout
        title="Incident Detail"
        left={leftPanel}
        center={
          <IncidentDetail
            incidentId={incidentId}
            prefetched={null}
            onBack={() => setRoute("incidents")}
            onFeedback={invalidateIncident}
          />
        }
        right={
          <MapView
            filters={filters}
            refreshToken={refreshToken}
            viewState={viewState}
            onViewState={updateViewState}
            onModeChange={(next) => applyFilters({ mapMode: next })}
            onSelect={(point) => {
              if (point.entity_type === "call") {
                setRoute(`call/${point.entity_id}`);
              } else {
                setRoute(`incident/${point.entity_id}`);
              }
            }}
          />
        }
        summary={summary}
        footer={audioFooter}
        sseStatus={{ status: sseStatus }}
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
        footer={null}
        sseStatus={{ status: sseStatus }}
      />
    );
  }

  const centerBody = listMode === "calls" ? (
    <CallsList
      filters={filters}
      refreshToken={refreshToken}
      onSelect={(callId) => setRoute(`call/${callId}`)}
      onPlay={async (callId) => {
        const detail = await getCachedCall(callId);
        setAudioSource({
          src: detail.audio?.url,
          label: `${detail.operator_fields?.agency || "Unknown"} \u00b7 ${
            detail.operator_fields?.incident_type || "Unspecified"
          }`
        });
      }}
    />
  ) : (
    <IncidentsBoard
      filters={filters}
      refreshToken={refreshToken}
      onSelect={(incidentId) => setRoute(`incident/${incidentId}`)}
    />
  );

  return (
    <AppLayout
      title="Operations"
      left={leftPanel}
      center={
        <div className="center-stack">
          <ViewToggle
            value={listMode}
            onChange={(next) => {
              setListMode(next);
              setRoute(next);
            }}
          />
          {centerBody}
        </div>
      }
      right={
        <MapView
          filters={filters}
          refreshToken={refreshToken}
          viewState={viewState}
          onViewState={updateViewState}
          onModeChange={(next) => applyFilters({ mapMode: next })}
          onSelect={(point) => {
            if (point.entity_type === "call") {
              setRoute(`call/${point.entity_id}`);
            } else {
              setRoute(`incident/${point.entity_id}`);
            }
          }}
        />
      }
      summary={summary}
      footer={audioFooter}
      sseStatus={{ status: sseStatus }}
    />
  );
}
