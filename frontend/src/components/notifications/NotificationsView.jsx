import React, { useEffect, useState } from "react";
import { listNotifications } from "../../api";
import { EmptyState } from "../common/EmptyState";

export function NotificationsView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await listNotifications();
        if (!active) return;
        setItems(response.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load notifications.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <EmptyState message="Loading notifications..." />;
  }

  if (error) {
    return <EmptyState message={`Failed to load notifications: ${error}`} />;
  }

  if (!items.length) {
    return <EmptyState message="No notifications yet." />;
  }

  return (
    <div className="notifications-view">
      <ul className="call-list">
        {items.map((note) => {
          const subjectType = note.subject_type || note.subjectType;
          const subjectId = note.subject_id || note.subjectId;
          const reason = note.error_detail || note.errorDetail || "";
          return (
            <li
              key={note.notification_id || `${subjectType}-${subjectId}`}
              className="cad-card"
            >
              <div className="cad-card-main">
                <div className="cad-card-title">{note.channel}</div>
                <div className="cad-card-meta">
                  {subjectType}: {subjectId}
                </div>
                <div className="incident-summary">{reason}</div>
              </div>
              <div className="cad-card-status">
                <span className="status-badge">{note.status}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
