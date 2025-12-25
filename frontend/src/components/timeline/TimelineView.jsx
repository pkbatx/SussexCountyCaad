import React, { useEffect, useMemo, useState } from "react";
import { normalizeTimelineEvents } from "../../state/timeline";
import { TimelineItem } from "./TimelineItem";

export function TimelineView({
  events,
  playback,
  onPlaybackUpdate,
  evidence,
  onSelectEvent,
  onOpenCall,
  defaultExpandedIds = []
}) {
  const { roots } = useMemo(() => normalizeTimelineEvents(events || []), [events]);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    if (!defaultExpandedIds.length) return;
    setExpandedIds((prev) => {
      const set = new Set(prev);
      defaultExpandedIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }, [defaultExpandedIds.join("|")]);

  useEffect(() => {
    if (!evidence?.eventIds?.length) return;
    setExpandedIds((prev) => {
      const set = new Set(prev);
      evidence.eventIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }, [evidence?.eventIds?.join("|")]);

  const toggleExpanded = (eventId) => {
    setExpandedIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const renderItems = (items, depth = 0) =>
    items.map((event) => (
      <TimelineItem
        key={event.event_id}
        event={event}
        depth={depth}
        expanded={expandedIds.includes(event.event_id)}
        onToggle={() => toggleExpanded(event.event_id)}
        onSelect={() => onSelectEvent?.(event)}
        playback={playback}
        onPlaybackUpdate={onPlaybackUpdate}
        evidence={evidence}
        onOpenCall={onOpenCall}
      >
        {event.children?.length ? renderItems(event.children, depth + 1) : null}
      </TimelineItem>
    ));

  return (
    <div className="timeline-view">
      {roots.length ? (
        <div className="timeline-list">{renderItems(roots)}</div>
      ) : (
        <div className="empty-state">No timeline events yet.</div>
      )}
    </div>
  );
}
