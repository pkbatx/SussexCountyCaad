import { listNotifications } from "../api";

export async function renderNotificationsView() {
  const container = document.createElement("div");
  container.className = "notifications-view";

  const { items } = await listNotifications();
  if (!items.length) {
    container.textContent = "No notifications yet.";
    return container;
  }

  const list = document.createElement("ul");
  list.className = "call-list";
  items.forEach((note) => {
    const subjectType = note.subject_type || note.subjectType;
    const subjectId = note.subject_id || note.subjectId;
    const reason = note.error_detail || note.errorDetail || "";
    const item = document.createElement("li");
    item.className = "call-item";
    item.innerHTML = `
      <div class="call-meta">
        <div class="call-id">${note.channel}</div>
        <div class="call-path">${subjectType}: ${subjectId}</div>
        <div class="incident-summary">${reason}</div>
      </div>
      <div class="call-status">${note.status}</div>
    `;
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}
