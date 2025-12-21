import { listCalls } from "../api";

export async function renderCallsView({ onSelect }) {
  const container = document.createElement("div");
  container.className = "calls-view";

  const { items } = await listCalls();
  if (!items.length) {
    container.textContent = "No calls yet.";
    return container;
  }

  const list = document.createElement("ul");
  list.className = "call-list";

  items.forEach((call) => {
    const item = document.createElement("li");
    item.className = "call-item";
    const status = call.status || "unknown";
    item.innerHTML = `
      <div class="call-meta">
        <div class="call-id">${call.call_id || call.callId}</div>
        <div class="call-path">${call.source_path || call.sourcePath}</div>
      </div>
      <div class="call-status">
        <span class="status-badge status-${status}">${status}</span>
      </div>
    `;
    item.addEventListener("click", () => onSelect(call.call_id || call.callId));
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}
