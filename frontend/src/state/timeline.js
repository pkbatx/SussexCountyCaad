function toTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function sortEvents(events) {
  events.sort((a, b) => {
    const left = a.timestamp_ms ?? 0;
    const right = b.timestamp_ms ?? 0;
    if (left !== right) return left - right;
    return String(a.event_id).localeCompare(String(b.event_id));
  });
  events.forEach((event) => sortEvents(event.children || []));
}

export function normalizeTimelineEvents(events = []) {
  const byId = new Map();
  const normalized = (events || []).map((event) => {
    const next = {
      ...event,
      timestamp_ms: toTimestamp(event.timestamp),
      children: []
    };
    byId.set(next.event_id, next);
    return next;
  });

  const roots = [];
  normalized.forEach((event) => {
    if (event.parent_event_id && byId.has(event.parent_event_id)) {
      byId.get(event.parent_event_id).children.push(event);
    } else {
      roots.push(event);
    }
  });

  sortEvents(roots);

  return { roots, byId };
}

export function flattenTimelineEvents(events = []) {
  const output = [];
  const visit = (items) => {
    items.forEach((item) => {
      output.push(item);
      if (item.children?.length) {
        visit(item.children);
      }
    });
  };
  visit(events);
  return output;
}
