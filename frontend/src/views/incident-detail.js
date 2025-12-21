import { getIncidentDetail } from "../api";

export async function renderIncidentDetailView({ incidentId, onBack }) {
  const container = document.createElement("div");
  container.className = "incident-detail";

  const data = await getIncidentDetail(incidentId);

  const back = document.createElement("button");
  back.className = "button";
  back.textContent = "Back to Incidents";
  back.addEventListener("click", onBack);

  const header = document.createElement("div");
  header.className = "detail-header";
  header.innerHTML = `
    <div class="detail-id">${data.incident.incident_id || data.incident.incidentId}</div>
    <div class="detail-path">${data.incident.normalized_address || "No address"}</div>
  `;

  const members = document.createElement("div");
  members.className = "detail-section";
  members.innerHTML = "<h2>Calls</h2>";
  const memberList = document.createElement("ul");
  data.members.forEach((member) => {
    const item = document.createElement("li");
    item.textContent = `${member.call_id || member.callId} (${member.link_reason || member.linkReason})`;
    memberList.appendChild(item);
  });
  members.appendChild(memberList);

  const rollups = document.createElement("div");
  rollups.className = "detail-section";
  rollups.innerHTML = "<h2>Rollup History</h2>";
  if (data.rollups?.length) {
    const rollupList = document.createElement("ul");
    data.rollups.forEach((rollup) => {
      const item = document.createElement("li");
      item.className = "rollup-item";
      const summary = document.createElement("div");
      summary.className = "rollup-summary";
      summary.textContent = rollup.summary_text;
      const meta = document.createElement("div");
      meta.className = "rollup-meta";
      meta.textContent = `version ${rollup.version} • confidence ${rollup.confidence}`;
      const calls = document.createElement("div");
      calls.className = "rollup-calls";
      const included = Array.isArray(rollup.included_call_ids)
        ? rollup.included_call_ids.join(", ")
        : "";
      calls.textContent = `calls: ${included || "n/a"}`;
      item.appendChild(summary);
      item.appendChild(meta);
      item.appendChild(calls);
      rollupList.appendChild(item);
    });
    rollups.appendChild(rollupList);
  } else {
    rollups.appendChild(document.createTextNode("No rollups yet."));
  }

  const locations = document.createElement("div");
  locations.className = "detail-section";
  locations.innerHTML = "<h2>Locations</h2>";
  if (data.locations.length) {
    const locList = document.createElement("ul");
    data.locations.forEach((loc) => {
      const item = document.createElement("li");
      item.textContent = loc.raw_text || loc.rawText;
      locList.appendChild(item);
    });
    locations.appendChild(locList);
  } else {
    locations.appendChild(document.createTextNode("No locations yet."));
  }

  container.appendChild(back);
  container.appendChild(header);
  container.appendChild(members);
  container.appendChild(rollups);
  container.appendChild(locations);

  return container;
}
