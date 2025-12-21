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
    const item = document.createElement("li");
    item.className = "call-item";
    item.innerHTML = `
      <div class="call-meta">
        <div class="call-id">${note.channel}</div>
        <div class="call-path">${note.subject_type || note.subjectType}: ${note.subject_id || note.subjectId}</div>
      </div>
      <div class="call-status">${note.status}</div>
    `;
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}
