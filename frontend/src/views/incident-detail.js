import { getIncidentDetail, submitIncidentFeedback, listIncidentFeedback } from "../api";

function formatRelative(value) {
  if (!value) return { text: "Unknown time", title: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { text: value, title: "" };
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  let text = "Just now";
  if (diffSeconds >= 60) {
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      text = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        text = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        text = `${diffDays}d ago`;
      }
    }
  }
  return { text, title: date.toLocaleString() };
}

export async function renderIncidentDetailView({
  incidentId,
  onBack,
  prefetched,
  onFeedback
}) {
  const container = document.createElement("div");
  container.className = "incident-detail";

  let data;
  try {
    data = prefetched || (await getIncidentDetail(incidentId));
  } catch (error) {
    container.textContent = `Failed to load incident detail: ${error.message}`;
    container.classList.add("empty-state");
    return container;
  }

  const back = document.createElement("button");
  back.className = "button";
  back.textContent = "Back to Incidents";
  back.addEventListener("click", onBack);

  const header = document.createElement("div");
  header.className = "detail-header";
  const latestRollup = data.rollups?.[0];
  const updatedAt = latestRollup?.created_at || data.incident.updated_at || "n/a";
  const updatedLabel = formatRelative(updatedAt);
  const summary = latestRollup?.summary_text || "No rollup summary yet.";
  const operator = data.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || operator.town || "No address";
  header.innerHTML = `
    <div class="detail-title">Incident Detail</div>
    <div class="detail-path">${addressLabel}</div>
    <div class="incident-meta">${agencyLabel} · ${typeLabel}</div>
    <div class="incident-updated" title="${updatedLabel.title}">last update ${updatedLabel.text}</div>
    <div class="incident-summary">${summary}</div>
  `;

  const memberMeta = new Map(
    (data.members || []).map((member) => [member.call_id || member.callId, member])
  );
  const memberCalls = data.member_calls?.length ? data.member_calls : data.members || [];

  const members = document.createElement("div");
  members.className = "detail-section";
  members.innerHTML = "<h2>Calls</h2>";
  const memberList = document.createElement("ul");
  memberCalls.forEach((member) => {
    const callId = member.call_id || member.callId;
    const meta = memberMeta.get(callId);
    const item = document.createElement("li");
    item.className = "evidence-item";
    const reason = meta?.link_reason || meta?.linkReason || "linked";
    const agency = member.agency || "Unknown";
    const serviceType = member.service_type ? ` · ${member.service_type}` : "";
    const time = member.first_seen_at
      ? new Date(member.first_seen_at).toLocaleString()
      : "Unknown time";
    item.textContent = `${agency}${serviceType} • ${reason} • ${time}`;
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
      meta.textContent = `version ${rollup.version}`;
      const keys = document.createElement("div");
      keys.className = "rollup-meta";
      const fields = rollup.key_fields || {};
      const keyText = [
        fields.agency,
        fields.incident_type,
        fields.address,
        fields.town,
        fields.cross_street,
        fields.poi
      ]
        .filter(Boolean)
        .join(" · ");
      keys.textContent = `key fields: ${keyText || "n/a"}`;
      const questions = document.createElement("div");
      questions.className = "rollup-meta";
      const open = Array.isArray(rollup.open_questions)
        ? rollup.open_questions.join(", ")
        : "";
      questions.textContent = `open questions: ${open || "none"}`;
      item.appendChild(summary);
      item.appendChild(meta);
      item.appendChild(keys);
      item.appendChild(questions);
      rollupList.appendChild(item);
    });
    rollups.appendChild(rollupList);
  } else {
    rollups.appendChild(document.createTextNode("No rollups yet."));
  }

  const feedback = document.createElement("div");
  feedback.className = "detail-section";
  feedback.innerHTML = "<h2>Feedback</h2>";
  const feedbackFields = [
    { label: "Agency", value: agencyLabel, type: "wrong_agency", confirm: "confirm_agency" },
    { label: "Incident type", value: typeLabel, type: "wrong_type", confirm: "confirm_type" },
    {
      label: "Address",
      value: operator.address || "No address",
      type: "wrong_address",
      confirm: "confirm_address"
    },
    { label: "Town", value: operator.town || "Unknown", type: "wrong_town", confirm: "confirm_town" },
    {
      label: "Cross street",
      value: operator.cross_street || "None",
      type: "wrong_cross_street",
      confirm: "confirm_cross_street"
    },
    { label: "POI", value: operator.poi || "None", type: "wrong_poi", confirm: "confirm_poi" }
  ];

  const fieldList = document.createElement("ul");
  fieldList.className = "detail-table";
  const feedbackHistory = document.createElement("ul");
  feedbackHistory.className = "evidence-list";
  feedbackFields.forEach((field) => {
    const item = document.createElement("li");
    item.className = "detail-row";
    const label = document.createElement("div");
    label.className = "detail-label";
    label.textContent = field.label;
    const value = document.createElement("div");
    value.className = "detail-value";
    value.textContent = field.value;
    const actions = document.createElement("div");
    actions.className = "detail-actions";
    const up = document.createElement("button");
    up.className = "thumb-button thumb-button--confirm";
    up.title = "Mark correct";
    up.textContent = "OK";
    up.addEventListener("click", async () => {
      up.disabled = true;
      await submitIncidentFeedback(incidentId, { feedback_type: field.confirm });
      const historyItem = document.createElement("li");
      historyItem.className = "evidence-item";
      historyItem.textContent = `${field.label} confirmed`;
      feedbackHistory.prepend(historyItem);
      onFeedback?.(incidentId);
      up.disabled = false;
    });
    const down = document.createElement("button");
    down.className = "thumb-button thumb-button--flag";
    down.title = "Mark incorrect";
    down.textContent = "Flag";
    down.addEventListener("click", async () => {
      down.disabled = true;
      await submitIncidentFeedback(incidentId, { feedback_type: field.type });
      const historyItem = document.createElement("li");
      historyItem.className = "evidence-item";
      historyItem.textContent = `${field.label} flagged (queued)`;
      feedbackHistory.prepend(historyItem);
      onFeedback?.(incidentId);
      down.disabled = false;
    });
    actions.appendChild(up);
    actions.appendChild(down);
    item.appendChild(label);
    item.appendChild(value);
    item.appendChild(actions);
    fieldList.appendChild(item);
  });

  try {
    const existing = await listIncidentFeedback(incidentId);
    existing.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${entry.feedback_type} • ${entry.apply_status}`;
      feedbackHistory.appendChild(item);
    });
  } catch (_error) {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = "Feedback history unavailable.";
    feedbackHistory.appendChild(item);
  }

  feedback.appendChild(fieldList);
  feedback.appendChild(feedbackHistory);

  container.appendChild(back);
  container.appendChild(header);
  container.appendChild(members);
  container.appendChild(rollups);
  container.appendChild(feedback);

  return container;
}
